export interface Video {
  id: string;
  title: string;
  youtubeId: string;
}

export interface VideoCategory {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  gradient: string;
  textColor: string;
  icon: string;
  videos: Video[];
}

export const categories: VideoCategory[] = [
  {
    id: "rain",
    title: "雨",
    titleEn: "Rain",
    description: "静かな雨音に包まれる",
    gradient: "from-slate-800 to-blue-900",
    textColor: "text-blue-200",
    icon: "🌧️",
    videos: [
      {
        id: "rain-1",
        title: "穏やかな雨音 - 8時間",
        youtubeId: "q76bMs-NwRk",
      },
      {
        id: "rain-2",
        title: "雨の窓辺 - 深夜の雨",
        youtubeId: "yIQd2Ya0Ziw",
      },
      {
        id: "rain-3",
        title: "森の雨音",
        youtubeId: "mPZkdNFkNps",
      },
    ],
  },
  {
    id: "ocean",
    title: "海",
    titleEn: "Ocean",
    description: "波の音が心を落ち着かせる",
    gradient: "from-cyan-900 to-teal-800",
    textColor: "text-cyan-200",
    icon: "🌊",
    videos: [
      {
        id: "ocean-1",
        title: "穏やかな海岸 - 波の音",
        youtubeId: "bn9F19Hi1Lk",
      },
      {
        id: "ocean-2",
        title: "深海の映像",
        youtubeId: "ClUu58WGCK4",
      },
      {
        id: "ocean-3",
        title: "砂浜と夕日",
        youtubeId: "V1RPi2MYptM",
      },
    ],
  },
  {
    id: "fireplace",
    title: "焚き火",
    titleEn: "Fireplace",
    description: "炎のゆらめきに見惚れる",
    gradient: "from-orange-900 to-red-900",
    textColor: "text-orange-200",
    icon: "🔥",
    videos: [
      {
        id: "fire-1",
        title: "暖炉の炎 - 4K",
        youtubeId: "L_LUpnjgPso",
      },
      {
        id: "fire-2",
        title: "キャンプファイヤー",
        youtubeId: "zqzreGOCPdg",
      },
      {
        id: "fire-3",
        title: "暖炉の炎と雨音",
        youtubeId: "UgHKb_7884o",
      },
    ],
  },
  {
    id: "forest",
    title: "森",
    titleEn: "Forest",
    description: "緑の息吹に包まれる",
    gradient: "from-green-900 to-emerald-800",
    textColor: "text-green-200",
    icon: "🌲",
    videos: [
      {
        id: "forest-1",
        title: "日本の森林 - 小川のせせらぎ",
        youtubeId: "xNN7iTA57jM",
      },
      {
        id: "forest-2",
        title: "竹林の風",
        youtubeId: "SqXoHxEbg-0",
      },
      {
        id: "forest-3",
        title: "新緑の森",
        youtubeId: "kzSpvbzQGBU",
      },
    ],
  },
  {
    id: "space",
    title: "宇宙",
    titleEn: "Space",
    description: "無限の宇宙に漂う",
    gradient: "from-indigo-950 to-purple-900",
    textColor: "text-indigo-200",
    icon: "🌌",
    videos: [
      {
        id: "space-1",
        title: "宇宙の旅 - NASAアーカイブ",
        youtubeId: "iYYRH4apXDo",
      },
      {
        id: "space-2",
        title: "星空タイムラプス",
        youtubeId: "dpVFnXs4-kw",
      },
      {
        id: "space-3",
        title: "オーロラ",
        youtubeId: "GRFjB1KQZTO",
      },
    ],
  },
  {
    id: "waterfall",
    title: "滝",
    titleEn: "Waterfall",
    description: "水の流れに心が洗われる",
    gradient: "from-sky-900 to-blue-800",
    textColor: "text-sky-200",
    icon: "💧",
    videos: [
      {
        id: "waterfall-1",
        title: "大自然の滝",
        youtubeId: "SeKclPSSKRk",
      },
      {
        id: "waterfall-2",
        title: "渓流の音",
        youtubeId: "V-_O7nl0Ii0",
      },
      {
        id: "waterfall-3",
        title: "山の滝と鳥のさえずり",
        youtubeId: "eKFTSSKCzWA",
      },
    ],
  },
  {
    id: "snow",
    title: "雪",
    titleEn: "Snow",
    description: "静寂の雪景色",
    gradient: "from-gray-800 to-slate-700",
    textColor: "text-gray-200",
    icon: "❄️",
    videos: [
      {
        id: "snow-1",
        title: "雪が降る夜",
        youtubeId: "8plwv6GUri4",
      },
      {
        id: "snow-2",
        title: "雪景色と暖炉",
        youtubeId: "bvhURT2GFHM",
      },
      {
        id: "snow-3",
        title: "吹雪の音",
        youtubeId: "kgx4WGK0oNU",
      },
    ],
  },
  {
    id: "aquarium",
    title: "水族館",
    titleEn: "Aquarium",
    description: "幻想的な海の世界",
    gradient: "from-blue-900 to-cyan-800",
    textColor: "text-blue-200",
    icon: "🐠",
    videos: [
      {
        id: "aqua-1",
        title: "幻想的な熱帯魚",
        youtubeId: "ydHv7h_Wmg0",
      },
      {
        id: "aqua-2",
        title: "珊瑚礁の世界",
        youtubeId: "1Oz7HoZpnVQ",
      },
      {
        id: "aqua-3",
        title: "クラゲの水槽",
        youtubeId: "ZkVoJBgKcB0",
      },
    ],
  },
];
