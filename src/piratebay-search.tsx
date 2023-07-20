import { Icon, Color, Action, ActionPanel } from "@raycast/api";
import cheerio from "cheerio";
import nodeFetch from "node-fetch";
import TorrentPage from "./torrent-page";

export default async function search(
  q = "",
  { fetch = nodeFetch, baseURL = "", page = 0, category = 0, sortby = "7" } = {}
) {
  if (!fetch) {
    throw new Error("piratebay-search: No fetch implementation provided");
  }

  if (!q || typeof q !== "string" || q.length === 0) {
    throw new Error("piratebay-search: Please provide valid search query");
  }

  if (page === undefined || !Number.isInteger(page)) {
    throw new Error(`piratebay-search: Invalid page of ${page} provided`);
  }

  const url = `${baseURL}/search/${encodeURIComponent(q)}/${page}/${sortby}/${category}`;
  const res = await fetch(url);
  const text = await res.text();

  const $ = cheerio.load(text);

  const torrents: Torrent[] = [];

  $("table[id='searchResult'] tr").each(function (this: cheerio.Element) {
    const icons: string[] = [];
    const hasComments = $(this)
      .find("td")
      .find("img")
      .each(function (i: number, link: cheerio.Element) {
        icons.push($(link).attr("src")?.split("/")?.pop()?.replace(/\..*/g, "") ?? "");
      });
    let commentsCount = "";
    if (icons.includes("icon_comment")) {
      $(this)
        .find("td")
        .find("img")
        .each(function (i: number, link: cheerio.Element) {
          const icon = $(link).attr("title");
          if (icon !== undefined && icon !== "") {
            commentsCount += $(link)
              .attr("title")
              ?.replace(/[^0-9]/g, "");
          }
        });
    }

    const description = $(this).find("font.detDesc").text();

    const torrent = {
      name: $(this).find("a.detLink").text(),
      type: $(this)
        .find("td.vertTh")
        .text()
        .trim()
        .replace(/\s+\((.*)\)/m, ` > $1`),
      link: $(this).find("a.detLink").attr("href") || "", // use empty string if undefined
      seedersCount: $(this).children("td:nth-child(3)").text(),
      leechersCount: $(this).children("td:nth-child(4)").text(),
      uploadedBy: description.replace(/.*ULed by *(.*)..*/gm, `$1`),
      uploadedAt: new Date(
        description
          .replace(/.*Uploaded (.*?),.*/gm, `$1`)
          .replace(" ", "-")
          .replace(/\d\d:\d\d/g, new Date().getFullYear().toString())
      ),
      size: description.replace(/.*Size (.*),.*/gm, `$1`).replace("i", ""),
      magnet: $(this).find('a[href^="magnet"]').attr("href") || "", // use empty string if undefined
      isVip: icons.includes("vip"),
      isTrusted: icons.includes("trusted"),
      hasComments: icons.includes("icon_comment"),
      commentsCount: commentsCount,
    };
    if (torrent.name) {
      torrents.push(torrent);
    }
  });
  return torrents;
}

// const proxies = [
// 	'https://pirateproxy.cam',
// 	'https://piratebay2.org',
// 	'https://thehiddenbay.com',
// 	'https://thepiratebay.wtf',
// 	'https://piratebay.kim/',
// 	'https://tpb.lc/',
// 	'https://thepiratebay.sh/',
// 	'https://pirateproxy.tel/',
// 	'https://bayproxy.click/',
// 	'https://piratebays.red/',
// 	'https://thepiratebay.love/',
// 	'https://thepiratebay.nz/',
// 	'https://piratebays.one/',
// 	'https://piratebays.pw/',
// 	'https://proxyproxy.org/',
// 	'https://piratepirate.be/',
// 	'https://proxybay.tel/',
// 	'https://tpbproxy.bz/',
// 	'https://baypirate.org/',
// 	'https://bayproxy.club/',
// 	'https://proxybay.nu/',
// 	'https://piratebays.click/',
// 	'https://pirateproxy.be/',
// 	'https://piratebay-proxylist.se/',
// 	'https://pirateproxy.wtf/',
// 	'https://www.pirateproxy.space/',
// 	'https://proxybay.live/',
// 	'https://tpbproxy.nl/'
// ]
//
// function getProxyList({fetch = nodeFetch} = {}) {
// 	return fetch('https://piratebay-proxylist.se/api/v1/proxies')
// 		.then(res => res.json())
// 		.then(json => json.proxies.map(proxy => `${proxy.secure ? 'https' : 'https'}://${proxy.domain}/`) || [])
// 		.then(domains => [...new Set(domains.concat(proxies))])
// 		.catch(err => {
// 			throw err;
// 		})
// }
//
// function isUp (url, {fetch = nodeFetch, wait = 2000} = {}) {
// 	return new Promise((resolve, reject) => {
// 		fetch(url, {method: 'HEAD'}).then(res => {
// 			resolve({url, up: res.status >= 200 && res.status < 400})
// 		})
// 		.catch(reject)
//
// 		setTimeout(() => resolve({url, up: false}), wait)
// 	})
// }
//
// async function checkIsUp ({fetch = nodeFetch, wait = 2000, urls = ['https://thepiratebay.org']} = {}) {
// 	const proxyList = await getProxyList();
// 	const proxyPromises = urls.concat(proxyList).map(url => isUp(url, {fetch, wait}))
// 	return Promise.all(proxyPromises)
// }

export function EntryAccessories(torrent: Torrent) {
  const tagText = torrent.isVip ? "V" : torrent.isTrusted ? "T" : "N";
  const tagColor = torrent.isVip ? Color.Green : torrent.isTrusted ? Color.Magenta : Color.SecondaryText;
  const tagTooltip = torrent.isVip
    ? "Uploaded by: " + torrent.uploadedBy + " (VIP)"
    : torrent.isTrusted
    ? "Uploaded by: " + torrent.uploadedBy + " (Trusted)"
    : "Uploaded by: " + torrent.uploadedBy;

  if (torrent.hasComments) {
    return [
      { icon: Icon.Upload, text: torrent.seedersCount, tooltip: "Seeders: " + torrent.seedersCount },
      { icon: Icon.Download, text: torrent.leechersCount, tooltip: "Leechers: " + torrent.leechersCount },
      {
        icon: Icon.MemoryStick,
        text: torrent.size.replace(/\..* /gm, " "),
        tooltip: "Size: " + torrent.size,
      },
      {
        tag: { value: torrent.commentsCount.toString(), color: Color.Yellow },
        tooltip: "Comments: " + torrent.commentsCount.toString(),
      },
      { tag: { value: tagText, color: tagColor }, tooltip: tagTooltip },
      {
        tag: { value: torrent.uploadedAt },
        tooltip:
          "Uploaded at: " +
          new Date(torrent.uploadedAt).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
      },
    ];
  } else {
    return [
      { icon: Icon.Upload, text: torrent.seedersCount, tooltip: "Seeders: " + torrent.seedersCount },
      { icon: Icon.Download, text: torrent.leechersCount, tooltip: "Leechers: " + torrent.leechersCount },
      {
        icon: Icon.MemoryStick,
        text: torrent.size.replace(/\..* /gm, " "),
        tooltip: "Size: " + torrent.size,
      },
      { tag: { value: tagText, color: tagColor }, tooltip: tagTooltip },
      {
        tag: { value: torrent.uploadedAt },
        tooltip:
          "Uploaded at: " +
          new Date(torrent.uploadedAt).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
      },
    ];
  }
}

export function EntryActions(torrent: Torrent, query: string, category: Boolean) {
  if (category) {
    return (
      <ActionPanel>
        <Action.Push
          icon={Icon.Book}
          title="Read Details"
          target={<TorrentPage torrent={torrent} query={query} />}
          shortcut={{ modifiers: [], key: "arrowRight" }}
        />
        <Action.Open icon={Icon.Logout} title="Open Magnet Link" target={torrent.magnet} />
        <Action.Open
          icon={Icon.Globe}
          title="Open Entry in Browser"
          target={torrent.link}
          shortcut={{ modifiers: ["opt"], key: "enter" }}
        />
        <Action.Open
          icon={Icon.Switch}
          title={`Switch to Search By Page`}
          target={"raycast://extensions/spacedog/piratebay/page?fallbackText=" + encodeURI(query)}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
        />
      </ActionPanel>
    );
  } else {
    return (
      <ActionPanel>
        <Action.Push
          icon={Icon.Book}
          title="Read Details"
          target={<TorrentPage torrent={torrent} query={query} />}
          shortcut={{ modifiers: [], key: "arrowRight" }}
        />
        <Action.Open icon={Icon.Logout} title="Open Magnet Link" target={torrent.magnet} />
        <Action.Open
          icon={Icon.Globe}
          title="Open Entry in Browser"
          target={torrent.link}
          shortcut={{ modifiers: ["opt"], key: "enter" }}
        />
        <Action.Open
          icon={Icon.Switch}
          title={`Switch to Search By Category`}
          target={"raycast://extensions/spacedog/piratebay/category?fallbackText=" + encodeURI(query)}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
        />
      </ActionPanel>
    );
  }
}

export type Torrent = {
  name: string;
  type: string;
  link: string;
  seedersCount: string;
  leechersCount: string;
  uploadedBy: string;
  uploadedAt: Date;
  size: string;
  commentsCount: string;
  hasComments: boolean;
  isVip: boolean;
  isTrusted: boolean;
  magnet: string;
};

export const categories = [
  {
    value: "0",
    title: "All",
  },
  {
    value: "100",
    title: "Audio",
  },
  {
    value: "101",
    title: "  Music",
  },
  {
    value: "102",
    title: "  Audio books",
  },
  {
    value: "103",
    title: "  Sound clips",
  },
  {
    value: "104",
    title: "  FLAC",
  },
  {
    value: "199",
    title: "  Other Audio",
  },
  {
    value: "200",
    title: "Video",
  },
  {
    value: "201",
    title: "  Movies",
  },
  {
    value: "202",
    title: "  Movies DVDR",
  },
  {
    value: "203",
    title: "  Music videos",
  },
  {
    value: "204",
    title: "  Movie clips",
  },
  {
    value: "205",
    title: "  TV shows",
  },
  {
    value: "206",
    title: "  Handheld Videos",
  },
  {
    value: "207",
    title: "  HD - Movies",
  },
  {
    value: "208",
    title: "  HD - TV shows",
  },
  {
    value: "209",
    title: "  3D",
  },
  {
    value: "299",
    title: "  Other Movies",
  },
  {
    value: "300",
    title: "Applications",
  },
  {
    value: "301",
    title: "  Windows",
  },
  {
    value: "302",
    title: "  Mac Apps",
  },
  {
    value: "303",
    title: "  UNIX",
  },
  {
    value: "304",
    title: "  Handheld Apps",
  },
  {
    value: "305",
    title: "  iOS (iPad/iPhone) Apps",
  },
  {
    value: "306",
    title: "  Android",
  },
  {
    value: "399",
    title: "  Other OS",
  },
  {
    value: "400",
    title: "Games",
  },
  {
    value: "401",
    title: "  PC",
  },
  {
    value: "402",
    title: "  Mac Games",
  },
  {
    value: "403",
    title: "  PSx",
  },
  {
    value: "404",
    title: "  XBOX360",
  },
  {
    value: "405",
    title: "  Wii",
  },
  {
    value: "406",
    title: "  Handheld Games",
  },
  {
    value: "407",
    title: "  iOS (iPad/iPhone) Games",
  },
  {
    value: "408",
    title: "  Android",
  },
  {
    value: "499",
    title: "  Other Games",
  },
  {
    value: "500",
    title: "Porn",
  },
  {
    value: "501",
    title: "  Movies (Porn)",
  },
  {
    value: "502",
    title: "  Movies DVDR (Porn)",
  },
  {
    value: "503",
    title: "  Pictures (Porn)",
  },
  {
    value: "504",
    title: "  Games (Porn)",
  },
  {
    value: "505",
    title: "  HD - Movies (Porn)",
  },
  {
    value: "506",
    title: "  Movie clips (Porn)",
  },
  {
    value: "599",
    title: "  Other Porn",
  },
  {
    value: "600",
    title: "Other",
  },
  {
    value: "601",
    title: "  E-books",
  },
  {
    value: "602",
    title: "  Comics",
  },
  {
    value: "603",
    title: "  Pictures",
  },
  {
    value: "604",
    title: "  Covers",
  },
  {
    value: "605",
    title: "  Physibles",
  },
  {
    value: "699",
    title: "  Other Other",
  },
];
