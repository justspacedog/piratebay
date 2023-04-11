import { Icon, Color, Detail, List, showToast, Toast, Action, ActionPanel, preferences } from "@raycast/api";
import cheerio from "cheerio";
import { useEffect, useState } from "react";
import { useFetch } from "@raycast/utils";
import nodeFetch from "node-fetch";
import {Torrent} from "./piratebay-search";

export default function TorrentPage(torrent: {torrent: Torrent}) {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useFetch(torrent.torrent.link, {
    // to make sure the screen isn't flickering when the searchText changes
    keepPreviousData: true,
    initialData: "",
  });

  const $ = cheerio.load(String(data));

  // ÜBERSCHRIFT
  let markdown = "# " + torrent.torrent.name + "\n";

  // Parse NFO
  let nfo = "";
  $(".nfo")
    .find("pre")
    .each(function (i, link) {
      nfo += $(link).text();
    });

  // NFO
  //sobald Daten da sind, werden sie in markdown überführt
  if (nfo) {
    markdown += nfo
      .split("~")
      .join("")
      .split("`")
      .join("")
      .replace(/(https?:\/\/(?:www\.|(?!www))[^\s.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/gim, "[$1]($1)");
  }

  let latestComment = "";
  if ($("#comments").find(".comment").last().text().replace(/\n/, "")) {
    latestComment = $("#comments")
      .find(".comment")
      .last()
      .text()
      .replace(/^\s+|\s+$/g, "");
  } else {
    latestComment = "<no comments>";
  }

  const titles: string[] = [];
  $("#details")
    .find("dt")
    .each(function (i, link) {
      titles.push($(link).text());
      // 		nfo += $(link).text();
    });
  const values: string[] = [];
  $("#details")
    .find("dd")
    .each(function (i, link) {
      values.push($(link).text().replace(/\n/g, "").replace(/\t/g, ""));
      // 		nfo += $(link).text();
    });

  const details: { title: string; value: string }[] = [];
  for (let index = 0; index < titles.length; ++index) {
    const detailEntry = {
      title: titles[index].replace(":", ""),
      value: values[index],
    };
    details.push(detailEntry);
  }

  const tagText = torrent.torrent.isVip ? "VIP" : torrent.torrent.isTrusted ? "Trusted" : "NONE";
  const tagColor = torrent.torrent.isVip ? Color.Green : torrent.torrent.isTrusted ? Color.Magenta : Color.SecondaryText;

  if (details.some((d) => d.title)) {
    // WAIT TILL WE HAVE THE DETAILS
    if (torrent.torrent.hasComments) {
      //LOADED WITH COMMENTS
      return (
        <Detail
          navigationTitle={torrent.torrent.name}
          isLoading={isLoading}
          markdown={markdown}
          metadata={
            <Detail.Metadata>
              <Detail.Metadata.Label
                title="Type"
                text={details.find((detail) => detail.title === "Type")?.value ?? ""}
              />
              <Detail.Metadata.Label
                title="Files"
                text={details.find((detail) => detail.title === "Files")?.value ?? ""}
              />
              <Detail.Metadata.Label
                title="Size"
                text={details.find((detail) => detail.title === "Size")?.value.replace("i", "") ?? ""}
              />
              <Detail.Metadata.Label
                title="Info Hash"
                text={$(".col2")
                  .last()
                  ?.html()
                  ?.replace(/.*dd>$/gm, "")
                  .replace(/.*dt>$/gm, "")
                  .replace(/.*a>$/gm, "")
                  .replace(/.*span>$/gm, "")
                  .replace(/.*br>$/gm, "")
                  .replace(/\s/g, "")
                  .replace(/.*i>/gm, "")}
              />
              <Detail.Metadata.Label
                title="Uploaded"
                text={
                  (details.find((detail) => detail.title === "Uploaded")?.value ?? "") &&
                  new Date(new Date(details.find((detail) => detail.title === "Uploaded")?.value ?? "").getTime() - (60 * 60 * 1000)).toLocaleDateString( // UTC Timecode -> -1h
                    "de-DE",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }
                  )
                }
              />
              <Detail.Metadata.Label title="By" text={details.find((detail) => detail.title === "By")?.value ?? ""} />
              <Detail.Metadata.TagList title="Tag">
                <Detail.Metadata.TagList.Item text={tagText} color={tagColor} />
              </Detail.Metadata.TagList>
              <Detail.Metadata.Label
                title="Seeders"
                text={details.find((detail) => detail.title === "Seeders")?.value ?? ""}
              />
              <Detail.Metadata.Label
                title="Leechers"
                text={details.find((detail) => detail.title === "Leechers")?.value ?? ""}
              />
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Comments">
                <Detail.Metadata.TagList.Item
                  text={
                    details
                      .find((detail) => detail.title === "Comments")
                      ?.value?.replace(/\t/g, "")
                      .replace(" ", "") ?? ""
                  }
                  color={Color.Yellow}
                />
              </Detail.Metadata.TagList>
              <Detail.Metadata.Label title="Latest Comment" text={latestComment} />
            </Detail.Metadata>
          }
          actions={EntryActions(torrent)}
        />
      );
    } else {
      //LOADED WITHOUT COMMENTS"
      return (
        <Detail
          navigationTitle={torrent.torrent.name}
          isLoading={isLoading}
          markdown={markdown}
          metadata={
            <Detail.Metadata>
              <Detail.Metadata.Label
                title="Type"
                text={details.find((detail) => detail.title === "Type")?.value ?? ""}
              />
              <Detail.Metadata.Label
                title="Files"
                text={details.find((detail) => detail.title === "Files")?.value ?? ""}
              />
              <Detail.Metadata.Label
                title="Size"
                text={details.find((detail) => detail.title === "Size")?.value.replace("i", "") ?? ""}
              />
              <Detail.Metadata.Label
                title="Info Hash"
                text={$(".col2")
                  .last()
                  ?.html()
                  ?.replace(/.*dd>$/gm, "")
                  .replace(/.*dt>$/gm, "")
                  .replace(/.*a>$/gm, "")
                  .replace(/.*span>$/gm, "")
                  .replace(/.*br>$/gm, "")
                  .replace(/\s/g, "")
                  .replace(/.*i>/gm, "")}
              />
              <Detail.Metadata.Label
                title="Uploaded"
                text={
                  (details.find((detail) => detail.title === "Uploaded")?.value ?? "") &&
                  new Date(new Date(details.find((detail) => detail.title === "Uploaded")?.value ?? "").getTime() - (60 * 60 * 1000)).toLocaleDateString( // UTC Timecode -> -1h
                    "de-DE",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }
                  )
                }
              />
              <Detail.Metadata.Label title="By" text={details.find((detail) => detail.title === "By")?.value ?? ""} />
              <Detail.Metadata.TagList title="Tag">
                <Detail.Metadata.TagList.Item text={tagText} color={tagColor} />
              </Detail.Metadata.TagList>
              <Detail.Metadata.Label
                title="Seeders"
                text={details.find((detail) => detail.title === "Seeders")?.value ?? ""}
              />
              <Detail.Metadata.Label
                title="Leechers"
                text={details.find((detail) => detail.title === "Leechers")?.value ?? ""}
              />
            </Detail.Metadata>
          }
          actions={EntryActions(torrent)}
        />
      );
    }
  } else {
    //LOADING (without any placeholder for comments, because it would not be updates)
    return (
      <Detail
        navigationTitle={torrent.torrent.name}
        isLoading={isLoading}
        markdown={"# " + torrent.torrent.name + "\n*Details are loading…*"}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Type" text={torrent.torrent.type} />
            <Detail.Metadata.Label title="Files" text={"…"} />
            <Detail.Metadata.Label title="Size" text={torrent.torrent.size} />
            <Detail.Metadata.Label title="Info Hash" text={"…"} />
            <Detail.Metadata.Label
              title="Uploaded"
              text={new Date(torrent.torrent.uploadedAt).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            />
            <Detail.Metadata.Label title="By" text={torrent.torrent.uploadedBy} />
              <Detail.Metadata.TagList title="Tag">
                <Detail.Metadata.TagList.Item text={tagText} color={tagColor} />
              </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Seeders" text={torrent.torrent.seedersCount} />
            <Detail.Metadata.Label title="Leechers" text={torrent.torrent.leechersCount} />
          </Detail.Metadata>
        }
        actions={EntryActions(torrent)}
      />
    );
  }
}

function EntryActions(torrent: {torrent: Torrent}) {
  return (
    <ActionPanel>
      <Action.Open icon={Icon.Logout} title="Open Magnet Link" target={torrent.torrent.magnet} />
      <Action.Open
        icon={Icon.Globe}
        title="Open Entry in Browser"
        target={torrent.torrent.link}
        shortcut={{ modifiers: ["opt"], key: "enter" }}
      />
    </ActionPanel>
  );
}
