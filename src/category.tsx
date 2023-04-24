import { List, showToast, Toast, preferences } from "@raycast/api";
import { useEffect, useState } from "react";
import search from "./piratebay-search";
import { Torrent, EntryAccessories, EntryActions, categories } from "./piratebay-search";

export default function Command() {
  const [query, setQuery] = useState<null | string>(null);
  const [state, setState] = useState<Torrent[]>([]);
  const [entries, setEntries] = useState<Torrent[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>();

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      if (category != undefined) {
        if (!query) {
          setQuery("*");
          setState([]);
          return;
        } else {
          try {
            setLoading(true);
            await search(encodeURI(query), {
              baseURL: preferences.instance.value != null ? (preferences.instance.value as string) : "",
              page: 0, // default 0
              category: category as unknown as number,
              sortby: preferences.sortby.value != null ? (preferences.sortby.value as string) : "", // default 'seeders'. Options are 'default', 'uploaded', 'size', 'uploadedBy', 'seeders' and 'leechers'
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
            setLoading(false);
          }
        }
      }
    }
    fetch();
  }, [query, category]);

  if (!entries) return;

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
          tooltip="Select Category"
          storeValue={true}
          onChange={(newValue) => {
            setCategory(newValue);
          }}
        >
          {categories.map((loc) => (
            <List.Dropdown.Item key={loc.value} title={loc.title} value={loc.value} keywords={[loc.title, loc.value]} />
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
