import { List, showToast, Toast, preferences } from "@raycast/api";
import cheerio from "cheerio";
import { useEffect, useState } from "react";
import nodeFetch from "node-fetch";
import search from "./piratebay-search";
import { Torrent, EntryAccessories, EntryActions } from "./piratebay-search";

interface Pages {
  value: string;
  title: string;
}

async function searchPages(q = "", { fetch = nodeFetch, baseURL = "", sortby = "7" } = {}) {
  if (!fetch) {
    throw new Error("piratebay-search: No fetch implementation provided");
  }

  if (!q || typeof q !== "string" || q.length === 0) {
    throw new Error("piratebay-search: Please provide valid search query");
  }

  const url = `${baseURL}/search/${encodeURIComponent(q)}/0/${sortby}/0`;
  const res = await fetch(url);
  const text = await res.text();

  const $ = cheerio.load(text);

  const pageNumbers = $("table[id='searchResult'] tr")
    .last()
    .text()
    .split("\n")
    .join("")
    .split(" ")
    .filter((item) => item); // empty Array entries are removed

  const pages: Pages[] = [];

  pageNumbers.forEach((element: string) => {
    if (/^-?\d+$/.test(element)) {
      // check if last element on page are numbers
      const pageEntry = {
        value: element,
        title: "Page " + element,
      };
      pages.push(pageEntry);
    } else if (pages.length === 0) {
      pages.push({
        value: "1",
        title: "Page 1",
      });
    }
  });
  return pages;
}

export default function Command() {
  const [query, setQuery] = useState<null | string>(null);
  const [state, setState] = useState<Torrent[]>([]);
  const [entries, setEntries] = useState<Torrent[]>([]);
  const [pages, setPages] = useState<Pages[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<string>("1");

  useEffect(() => {
    setLoading(true);
    async function fetch() {
      if (page != undefined) {
        if (!query) {
          setQuery("*");
          setState([]);
          return;
        }
        try {
          await search(encodeURI(query), {
            baseURL: preferences.instance.value != null ? (preferences.instance.value as string) : "", // default https://thepiratebay.org
            page: Number(page), // default 0
            sortby: preferences.sortby.value != null ? (preferences.sortby.value as string) : "",
          })
            .then((res: Torrent[]) => setEntries(res))
            .catch(console.error);
        } catch (e) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch entries",
            message: "Please try again later",
          });
        } finally {
          try {
            await searchPages(encodeURI(query), {
              baseURL: preferences.instance.value != null ? (preferences.instance.value as string) : "",
              sortby: preferences.sortby.value != null ? (preferences.sortby.value as string) : "",
            })
              .then((pages: Pages[]) => setPages(pages))
              .catch(console.error);
          } catch (e) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to fetch entries",
              message: "Please try again later",
            });
          } finally {
            setLoading(false);
          }
        }
      }
    }
    fetch();
  }, [query, page]);

  return (
    <List
      navigationTitle={`PirateBay Search`}
      filtering={false}
      onSearchTextChange={(text) => {
        setQuery(text);
      }}
      throttle={true}
      isLoading={loading}
      searchBarPlaceholder="Search entry..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Page"
          storeValue={true}
          onChange={(newValue) => {
            setPage(newValue);
          }}
        >
          {pages.map((page) => (
            <List.Dropdown.Item
              key={page.value}
              title={page.title}
              value={page.value}
              keywords={[page.title, page.value]}
            />
          ))}
        </List.Dropdown>
      }
    >
      {entries.map((entry: Torrent) => {
        return (
          <List.Item
            key={entry.link}
            title={{value:entry.name, tooltip: "Category: " + entry.type}}
            accessories={EntryAccessories(entry)}
            actions={EntryActions(entry)}
          />
        );
      })}
    </List>
  );
}
