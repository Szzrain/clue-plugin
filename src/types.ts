import { Ext } from "./values";

/**
 * 1. 记录id、名称（？）、成员、最近10分钟的消息（需要可清除）
 * 2. 从JSON对象中读取数据
 */
export class ExtGroupInfo {
  public id: string;
  public name: string;
  // 成员列表, key为成员id
  public members: Map<string, MemberInfo>;
  public groupBook: string[];
  // default false
  private observeChat: boolean;
  // 最近的消息, not saved to JSON
  public chatHistory: ChatHistory;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.members = new Map();
    this.groupBook = [];
    this.observeChat = false;
    this.chatHistory = new ChatHistory();
  }

  public startObserveChat() {
    this.observeChat = true;
    this.chatHistory.beginObserveChat();
  }

  public stopObserveChat() {
    this.observeChat = false;
    this.chatHistory.endObserveChat();
  }

  public getObservingStatus() {
    return this.observeChat;
  }

  public getMember(id: string, name: string): MemberInfo {
    let member = this.members.get(id);
    if (!member) {
      member = new MemberInfo(id, name);
      this.members.set(id, member);
    }
    return member;
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      members: Object.fromEntries(this.members),
      observeChat: this.observeChat,
      groupBook: this.groupBook,
    }
  }

  public fromJSON(obj: any) {
    this.id = obj.id;
    this.name = obj.name;
    for (let [key, value] of Object.entries(obj.members)) {
      let member = new MemberInfo("", "");
      member.fromJSON(value);
      this.members.set(key, member);
    }
    this.observeChat = obj.observeChat;
    this.groupBook = obj.groupBook;
    if (this.observeChat) {
      this.startObserveChat();
    }
  }
}

// MemberInfo 只会存在于 GroupInfo.members 中，个人的信息存在 PersonalInfo 中
export class MemberInfo {
  public id: string;
  public name: string;
  public groupPersonalBooks: string[];

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.groupPersonalBooks = [];
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      groupPersonalBooks: this.groupPersonalBooks,
    }
  }

  public fromJSON(obj: any) {
    this.id = obj.id;
    this.name = obj.name;
    this.groupPersonalBooks = obj.groupPersonalBooks;
  }
}

export class PersonalInfo {
  public id: string;
  public name: string;
  public personalBooks: string[];

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.personalBooks = [];
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      personalBooks: this.personalBooks,
    }
  }

  public fromJSON(obj: any) {
    this.id = obj.id;
    this.name = obj.name;
    this.personalBooks = obj.personalBooks;
  }
}


export interface ChatMessage {
  content: string;
  id: string; // 消息id
  timestamp: number; // 时间戳，毫秒
}

export class ChatHistory {
  private messages: ChatMessage[] = [];

  // private cleanupIntervalId: number | undefined;

  private observingChat: boolean = false;

  public beginObserveChat() {
    if (this.observingChat) {
      return;
    } else {
      this.observingChat = true;
      // 使用浏览器的setInterval，每分钟清理一次，后来发现very buggy，改为被动清理
      // this.cleanupIntervalId = setInterval(() => {
      //   try {
      //     this.cleanupOldMessages();
      //   } catch (e) {
      //     console.error("CLUE CYCLE ERROR: " +e);
      //   }
      // }, 60 * 1000);
    }
  }

  public endObserveChat() {
    if (this.observingChat) {
      this.observingChat = false;
      // if (this.cleanupIntervalId !== undefined) {
      //   clearInterval(this.cleanupIntervalId);
      // }
    }
  }

  constructor() {
  }

  // 添加消息
  public addMessage(content: string, id: string): void {
    const timestamp = Date.now();
    this.messages.push({ content: content, id: id, timestamp: timestamp });
    this.cleanupOldMessages();
  }

  // 获取最近的消息
  public getRecentMessages(): ChatMessage[] {
    this.cleanupOldMessages();
    return [...this.messages];
  }

  // 内部方法：清理旧消息
  public cleanupOldMessages(): void {
    const now = Date.now();
    let expireDuration = seal.ext.getConfig(Ext, "historyExpireSecond").value > 0 ? seal.ext.getConfig(Ext, "historyExpireSecond").value * 1000 : 60 * 10 * 1000;
    if (isNaN(expireDuration) || expireDuration <= 0) {
      expireDuration = 10 * 60 * 1000; // 10分钟
    }
    this.messages = this.messages.filter(
      msg => now - msg.timestamp <= expireDuration
    );
  }

  // public destroy(): void {
  //   if (this.cleanupIntervalId !== undefined) {
  //     window.clearInterval(this.cleanupIntervalId);
  //   }
  // }
}
