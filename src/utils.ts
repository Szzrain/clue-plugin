import { Ext } from "./values";

export class RecordBoard {
  // 每页记录数
  static getPageSize(): number {
    return seal.ext.getConfig(Ext, 'pageSize').value > 0 ? seal.ext.getConfig(Ext, 'pageSize').value : 5;
  }

  // 添加记录（返回新数组）
  static add(records: string[], newRecord: string): string[] {
    return [...records, newRecord];
  }

  // 获取某一页（倒序显示）
  static view(records: string[], page: number = 1): string[] {
    const pageSize = this.getPageSize();
    const reversed = [...records].map((r, i) => ({ index: i + 1, record: r })).reverse();

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return reversed.slice(start, end).map(item => item.record);
  }

  // 获取总页数
  static getTotalPages(records: string[]): number {
    const pageSize = this.getPageSize();
    return Math.ceil(records.length / pageSize);
  }

  // 删除指定编号的记录（编号从 1 开始，正序），返回新数组
  static delete(records: string[], index: number): string[] {
    if (index < 1 || index > records.length) return records;
    return records.slice(0, index - 1).concat(records.slice(index));
  }

  // 判断页码是否有效（非空时）
  static isValidPage(records: string[], page: number): boolean {
    if (records.length === 0) return page === 1;
    const totalPages = this.getTotalPages(records);
    return page >= 1 && page <= totalPages;
  }

  // 获取格式化分页字符串（带编号、横线、页码信息）
  static viewFormatted(records: string[], page: number = 1): string {
    const pageSize = this.getPageSize();
    const totalPages = this.getTotalPages(records);

    if (page < 1) {
      return "错误：页码不能小于 1";
    }

    if (records.length === 0) {
      return `<无记录>`;
    }

    if (page > totalPages) {
      return `错误：页码超出范围，最大页码为 ${totalPages}`;
    }

    const reversed = [...records].map((r, i) => ({ index: i + 1, record: r })).reverse();

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const pageItems = reversed.slice(start, end);

    let output = ``;

    output += pageItems
      .map(item => `${item.index}. ${item.record}\n\n-----`)
      .join('\n\n');

    if (pageItems.length > 0) {
      output = output.replace(/\n\n-----$/, ''); // 去掉最后的分隔线
    }
    output += `\n\n第[${page}/${totalPages}]页`;
    return output;
  }
}

export function matchMessage(input: string, symbols: string[]): number | null {
  const escapedSymbols = symbols.map(s => '\\' + s).join('|');
  const pattern = new RegExp(
    String.raw`\[CQ:reply,id=(\d+)](?:\s*\[CQ:at,qq=\d+])?\s*(?:${escapedSymbols})c\s*rec`,
    'i'
  );
  const match = input.match(pattern);
  if (match) {
    return parseInt(match[1], 10); // 捕获 id 数字
  }
  return null;
}
