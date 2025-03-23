import {ExtGroupInfo, PersonalInfo} from "../types";
import ExtInfo = seal.ExtInfo;

export var GroupMap: Map<string, ExtGroupInfo>;

export var PeopleMap: Map<string, PersonalInfo>;

export function Init(ext: ExtInfo) {
  GroupMap = groupLoad(ext);
  PeopleMap = peopleLoad(ext);
  seal.ext.registerIntConfig(ext, "historyExpireSecond", 60 * 10); // 10分钟
  seal.ext.registerIntConfig(ext, "pageSize", 5); // 每页5条
  seal.ext.registerTemplateConfig(ext,"cluerec_prefix", [".","。",",","，"]);
}

function groupLoad(ext: ExtInfo) {
  let groupMapTemp = new Map<string, ExtGroupInfo>();
  Object.entries(JSON.parse(ext.storageGet("groupMap") || '{}')).forEach(([key, value]) => {
    let groupTemp = new ExtGroupInfo(key, "");
    groupTemp.fromJSON(value);
    groupMapTemp.set(key, groupTemp);
  });
  return groupMapTemp;
}

function peopleLoad(ext: ExtInfo) {
  let peopleMapTemp = new Map<string, PersonalInfo>();
  Object.entries(JSON.parse(ext.storageGet("peopleMap") || '{}')).forEach(([key, value]) => {
    let userTemp = new PersonalInfo(key, "");
    userTemp.fromJSON(value);
    peopleMapTemp.set(key, userTemp);
  });
  return peopleMapTemp;
}

export function Save(ext: ExtInfo) {
  saveGroupMap(GroupMap, ext);
  savePeopleMap(PeopleMap, ext);
}

function saveGroupMap(groupMap: Map<string, ExtGroupInfo>, ext: ExtInfo) {
  let groupMapTemp = new Map<string, object>();
  groupMap.forEach((value, key) => {
    groupMapTemp.set(key, value);
  });
  ext.storageSet("groupMap", JSON.stringify(Object.fromEntries(groupMapTemp)));
}

function savePeopleMap(peopleMap: Map<string, PersonalInfo>, ext: ExtInfo) {
  let peopleMapTemp = new Map<string, object>();
  peopleMap.forEach((value, key) => {
    peopleMapTemp.set(key, value);
  });
  ext.storageSet("peopleMap", JSON.stringify(Object.fromEntries(peopleMapTemp)));
}

export function getGroupInfo(groupId: string, groupName: string) {
  let group = GroupMap.get(groupId);
  if (!group) {
    group = new ExtGroupInfo(groupId, groupName);
    GroupMap.set(groupId, group);
  } else {
    group.name = groupName;
  }
  return group;
}

export function getPersonalInfo(userId: string, userName: string) {
  let user = PeopleMap.get(userId);
  if (!user) {
    user = new PersonalInfo(userId, userName);
    PeopleMap.set(userId, user);
  } else {
    user.name = userName;
  }
  return user;
}

export function resetAll() {
  GroupMap = new Map<string, ExtGroupInfo>();
  PeopleMap = new Map<string, PersonalInfo>();
}
