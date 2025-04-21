import {Ext, PLUGIN_NAME} from "./values";
import {getGroupInfo, Init, resetAll, Save} from "./io/io";
import {matchMessage, RecordBoard, removeItemsByUserIndices} from "./utils";

function main() {
  // 注册扩展
  let ext = seal.ext.find(PLUGIN_NAME);
  if (!ext) {
    ext = Ext;
    seal.ext.register(ext);
  }

  Init(ext);

  ext.onMessageReceived = (rctx, msg) => {
    if (!rctx.isPrivate && rctx.isCurGroupBotOn) {
      let groupInfo = getGroupInfo(rctx.group.groupId, rctx.group.groupName);
      let match = matchMessage(msg.message, seal.ext.getConfig(ext, "cluerec_prefix").value as string[]);
      if (match) {
        let targetId = match;
        let result = groupInfo.chatHistory.getRecentMessages().find(msg => msg.id === targetId.toString());
        if (result) {
          let member = groupInfo.getMember(rctx.player.userId, rctx.player.name);
          member.groupPersonalBooks.push(result.content);
          Save(ext);
          seal.replyToSender(rctx, msg, `已记录${seal.format(rctx, "{$t玩家}")}的笔记：${result.content}`);
        } else {
          seal.replyToSender(rctx, msg, `未找到指定消息，可能是时间过久或本群内未开启记录追溯，追踪id：${targetId}`);
        }
      } else {
        groupInfo.chatHistory.addMessage(msg.message, msg.rawId.toString());
      }
    }
  }

  // 编写指令
  const cmdClue = seal.ext.newCmdItemInfo();
  cmdClue.name = 'clue';
  cmdClue.help = '.c [页码] 查看群内笔记\n' +
  '.c [内容] 记录群内笔记\n' +
  '.c help 查看帮助\n' +
  '.c del [编号] 删除指定笔记\n' +
  '.c cutoff [编号] 删除指定编号之前的所有笔记\n' +
  '.c find [内容] 查找笔记\n' +
  '.c reset 重置所有群内笔记（仅限骰主）';
  cmdClue.raw = true;
  cmdClue.checkCurrentBotOn = true;
  cmdClue.solve = (ctx, msg, cmdArgs) => {
    let val = cmdArgs.getArgN(1);
    let allArgs = cmdArgs.eatPrefixWith("")[0];
    let isPrivate = ctx.isPrivate;
    if (isPrivate) {
      seal.replyToSender(ctx, msg, '请在群聊中使用此指令，或者使用.cp help指令查看个人笔记使用帮助');
      return seal.ext.newCmdExecuteResult(true);
    }
    switch (val) {
      case 'help': {
        const ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
      }
      case 'del': {
        allArgs = cmdArgs.getRestArgsFrom(2);
        if (!allArgs) {
          seal.replyToSender(ctx, msg, '请输入要删除的笔记编号，多个编号用空格分隔');
          return seal.ext.newCmdExecuteResult(true);
        }
        let allArgsArr = allArgs.split(' ');
        let groupInfo = getGroupInfo(ctx.group.groupId, ctx.group.groupName);
        let member = groupInfo.getMember(ctx.player.userId, ctx.player.name);
        try {
          member.groupPersonalBooks = removeItemsByUserIndices(member.groupPersonalBooks, allArgsArr);
          Save(ext);
          seal.replyToSender(ctx, msg, '已删除指定笔记: ' + allArgs);
        } catch (e) {
          seal.replyToSender(ctx, msg, e);
        }
        return seal.ext.newCmdExecuteResult(true);
      }
      case 'cutoff': { // 指定一个编号，删除编号之前的所有笔记
        let num = parseInt(allArgs);
        if (isNaN(num) || num <= 0) {
          seal.replyToSender(ctx, msg, '请输入正确的笔记编号');
          return seal.ext.newCmdExecuteResult(true);
        }
        let groupInfo = getGroupInfo(ctx.group.groupId, ctx.group.groupName);
        let member = groupInfo.getMember(ctx.player.userId, ctx.player.name);
        if (num > member.groupPersonalBooks.length) {
          seal.replyToSender(ctx, msg, '编号超出范围');
          return seal.ext.newCmdExecuteResult(true);
        }
        try {
          member.groupPersonalBooks.splice(num - 1);
          Save(ext);
          seal.replyToSender(ctx, msg, '已删除编号为' + num + '之前的所有笔记');
        } catch (e) {
          seal.replyToSender(ctx, msg, e);
        }
        return seal.ext.newCmdExecuteResult(true);
      }
      case 'find': {
        if (!cmdArgs.getArgN(2)) {
          seal.replyToSender(ctx, msg, '请输入要查找的内容');
          return seal.ext.newCmdExecuteResult(true);
        }
        let groupInfo = getGroupInfo(ctx.group.groupId, ctx.group.groupName);
        let member = groupInfo.getMember(ctx.player.userId, ctx.player.name);
        let result = member.groupPersonalBooks
          .map((content, index) => ({ content, index: index + 1 })) // 保留原始序号
          .filter((book) => book.content.includes(cmdArgs.getArgN(2)))
          .reverse(); // 倒序排列

        if (result.length === 0) {
          seal.replyToSender(ctx, msg, '未找到相关笔记');
          return seal.ext.newCmdExecuteResult(true);
        }

        let view = `====[${seal.format(ctx, "{$t玩家}")} 的群内笔记 (查询:${cmdArgs.getArgN(2)}) ]====\n`;
        result.forEach((book) => {
          view += `[${book.index}] ${book.content}\n`;
        });

        seal.replyToSender(ctx, msg, view);
        return seal.ext.newCmdExecuteResult(true);
      }
      case 'reset': {
        if (ctx.privilegeLevel < 100) {
          seal.replyToSender(ctx, msg, '你没有权限使用此指令');
          return seal.ext.newCmdExecuteResult(true);
        }
        resetAll();
        Save(ext);
        seal.replyToSender(ctx, msg, '已重置所有群内笔记');
        return seal.ext.newCmdExecuteResult(true);
      }
      case 'rec': {
        console.log("Clue: Rec Triggered");
        console.log("Raw message:" + msg.message);
        return seal.ext.newCmdExecuteResult(true);
      }
      default: {
        // 无参数，展示笔记内容
        let num = parseInt(val);
        if (!val) {
          let groupInfo = getGroupInfo(ctx.group.groupId, ctx.group.groupName);
          let view = `====[${seal.format(ctx, "{$t玩家}")} 的群内笔记]====\n`;
          view += RecordBoard.viewFormatted(groupInfo.getMember(ctx.player.userId, ctx.player.name).groupPersonalBooks);
          seal.replyToSender(ctx, msg, view);
          return seal.ext.newCmdExecuteResult(true);
        } else if (!isNaN(num)) {
          if (num <= 0) {
            seal.replyToSender(ctx, msg, '页码不合法，应为正整数');
            return seal.ext.newCmdExecuteResult(true);
          } else {
            let groupInfo = getGroupInfo(ctx.group.groupId, ctx.group.groupName);
            let member = groupInfo.getMember(ctx.player.userId, ctx.player.name);
            // if (!RecordBoard.isValidPage(member.groupPersonalBooks, num)) {
            //   seal.replyToSender(ctx, msg, '页码超出范围');
            //   return seal.ext.newCmdExecuteResult(true);
            // }
            let view = `====[${seal.format(ctx, "{$t玩家}")} 的群内笔记]====\n`;
            view += RecordBoard.viewFormatted(member.groupPersonalBooks, num);
            seal.replyToSender(ctx, msg, view);
            return seal.ext.newCmdExecuteResult(true);
          }
        } else { // 并非数字，记录进笔记
          let groupInfo = getGroupInfo(ctx.group.groupId, ctx.group.groupName);
          let member = groupInfo.getMember(ctx.player.userId, ctx.player.name);
          let content = allArgs;
          member.groupPersonalBooks.push(content);
          Save(Ext);
          seal.replyToSender(ctx, msg, `已记录${seal.format(ctx, "{$t玩家}")}的笔记：${content}`);
          return seal.ext.newCmdExecuteResult(true);
        }
      }
    }
  }

  const cmdClueObserveHistory = seal.ext.newCmdItemInfo();
  cmdClueObserveHistory.name = 'clueob';
  cmdClueObserveHistory.help = 'TODO (doc)';
  cmdClueObserveHistory.disabledInPrivate = true;
  cmdClueObserveHistory.solve = (ctx, msg, cmdArgs) => {
    if (ctx.privilegeLevel < 100) {
      seal.replyToSender(ctx, msg, '你没有权限使用此指令');
      return seal.ext.newCmdExecuteResult(true);
    }
    let val = cmdArgs.getArgN(1);
    switch (val) {
      case 'help': {
        const ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
      }
      case "on": {
        let groupInfo = getGroupInfo(ctx.group.groupId, ctx.group.groupName);
        groupInfo.startObserveChat()
        Save(ext);
        seal.replyToSender(ctx, msg, '已开启群内笔记记录追溯');
        return seal.ext.newCmdExecuteResult(true);
      }
      case "off": {
        let groupInfo = getGroupInfo(ctx.group.groupId, ctx.group.groupName);
        groupInfo.stopObserveChat()
        Save(ext);
        seal.replyToSender(ctx, msg, '已关闭群内笔记记录追溯');
        return seal.ext.newCmdExecuteResult(true);
      }
      // case "dump": {
      //   let groupInfo = getGroupInfo(ctx.group.groupId, ctx.group.groupName);
      //   let view = `====[群内笔记记录追溯]====\n\n`;
      //   groupInfo.chatHistory.getRecentMessages().forEach((msg) => {
      //     view += `[${msg.id}]: ${msg.content}\n`;
      //   });
      //   seal.replyToSender(ctx, msg, view);
      //   return seal.ext.newCmdExecuteResult(true);
      // }
      default: {
        seal.replyToSender(ctx, msg, `当前群内笔记记录追溯状态：${getGroupInfo(ctx.group.groupId, ctx.group.groupName).getObservingStatus() ? '开启' : '关闭'}`);
        return seal.ext.newCmdExecuteResult(true);
      }
    }
  }

  // 注册命令
  ext.cmdMap['clue'] = cmdClue;
  ext.cmdMap['c'] = cmdClue;
  ext.cmdMap['clueob'] = cmdClueObserveHistory;
  ext.cmdMap['cob'] = cmdClueObserveHistory;
}

main();
