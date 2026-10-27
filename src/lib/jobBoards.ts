export type JobBoard = {
  id: string;
  name: string;
  description: string;
  /** 品牌色，仅用于小圆点 */
  brand: string;
  /** 该站是否支持在链接里带上城市 */
  cityInUrl: boolean;
  note?: string;
};

export const JOB_BOARDS: JobBoard[] = [
  {
    id: "boss",
    name: "BOSS直聘",
    description: "岗位量最大，可直接和招聘者沟通",
    brand: "#00A6A7",
    cityInUrl: true,
  },
  {
    id: "lagou",
    name: "拉勾",
    description: "互联网岗位集中，技术岗匹配度高",
    brand: "#00B38A",
    cityInUrl: true,
  },
  {
    id: "liepin",
    name: "猎聘",
    description: "中高端岗位与猎头较多",
    brand: "#0F6EFF",
    cityInUrl: false,
    note: "城市请在站内筛选",
  },
  {
    id: "zhilian",
    name: "智联招聘",
    description: "覆盖行业广，传统企业岗位多",
    brand: "#0068B7",
    cityInUrl: true,
  },
  {
    id: "51job",
    name: "前程无忧",
    description: "综合类岗位，适合扩大投递面",
    brand: "#FF6000",
    cityInUrl: false,
    note: "城市请在站内筛选",
  },
];

/** BOSS直聘城市编码 */
const BOSS_CITY_CODES: Record<string, string> = {
  全国: "",
  北京: "101010100",
  上海: "101020100",
  广州: "101280100",
  深圳: "101280600",
  杭州: "101210100",
  成都: "101270100",
  南京: "101190100",
  武汉: "101200100",
  西安: "101110100",
  苏州: "101190400",
  长沙: "101250100",
  郑州: "101180100",
  天津: "101030100",
  重庆: "101040100",
  合肥: "101220100",
  厦门: "101230200",
  青岛: "101120200",
  大连: "101070200",
  济南: "101120100",
  东莞: "101281600",
  佛山: "101280800",
  宁波: "101210400",
  无锡: "101190200",
  福州: "101230100",
  珠海: "101280700",
  中山: "101281700",
  惠州: "101280300",
  温州: "101210700",
  南昌: "101240100",
  昆明: "101290100",
  贵阳: "101260100",
  南宁: "101300100",
  哈尔滨: "101050100",
  沈阳: "101070100",
  长春: "101060100",
  石家庄: "101090100",
  太原: "101100100",
  乌鲁木齐: "101130100",
  呼和浩特: "101080100",
  兰州: "101160100",
  海口: "101310100",
};

function cleanCity(city: string): string {
  return city.trim();
}

function bossUrl(keyword: string, city: string): string {
  const code = BOSS_CITY_CODES[cleanCity(city)];
  const params = new URLSearchParams({ query: keyword });
  if (code) params.set("city", code);
  return `https://www.zhipin.com/web/geek/job?${params.toString()}`;
}

function lagouUrl(keyword: string, city: string): string {
  const params = new URLSearchParams({ kd: keyword });
  if (cleanCity(city)) params.set("city", cleanCity(city));
  return `https://www.lagou.com/wn/jobs?${params.toString()}`;
}

export function buildJobBoardUrl(
  boardId: string,
  keyword: string,
  city: string,
): string {
  const kw = keyword.trim();
  switch (boardId) {
    case "boss":
      return bossUrl(kw, city);
    case "lagou":
      return lagouUrl(kw, city);
    case "liepin":
      return `https://www.liepin.com/zhaopin/?key=${encodeURIComponent(kw)}`;
    case "zhilian": {
      const params = new URLSearchParams({ kw });
      if (cleanCity(city)) params.set("jl", cleanCity(city));
      return `https://sou.zhaopin.com/?${params.toString()}`;
    }
    case "51job":
      return `https://we.51job.com/pc/search?keyword=${encodeURIComponent(kw)}`;
    default:
      return "https://www.zhipin.com/";
  }
}
