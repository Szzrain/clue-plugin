import {Ext, PLUGIN_NAME} from "./values";
import {getGroupInfo, Init, resetAll, Save} from "./io/io";
import {matchMessage, RecordBoard} from "./utils";

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
  cmdClue.help = 'TODO (doc)';
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
        allArgs = cmdArgs.eatPrefixWith("del")[0];
        let num = parseInt(allArgs);
        if (isNaN(num) || num <= 0) {
          seal.replyToSender(ctx, msg, '序号不合法，应为正整数');
          return seal.ext.newCmdExecuteResult(true);
        } else {
          let groupInfo = getGroupInfo(ctx.group.groupId, ctx.group.groupName);
          let member = groupInfo.getMember(ctx.player.userId, ctx.player.name);
          if (num > member.groupPersonalBooks.length) {
            seal.replyToSender(ctx, msg, '条目超出范围');
            return seal.ext.newCmdExecuteResult(true);
          } else {
            member.groupPersonalBooks = RecordBoard.delete(member.groupPersonalBooks, num);
            Save(ext);
            seal.replyToSender(ctx, msg, `已删除${seal.format(ctx, "{$t玩家}")}的第${num}条笔记`);
            return seal.ext.newCmdExecuteResult(true);
          }
        }
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
          let view = `====[${seal.format(ctx, "{$t玩家}")} 的群内笔记]====\n\n`;
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
            let view = `====[${seal.format(ctx, "{$t玩家}")} 的群内笔记]====\n\n`;
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
