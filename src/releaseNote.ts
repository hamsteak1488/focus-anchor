export async function getReleaseNoteHtml(): Promise<string> {
  const response = await fetch(chrome.runtime.getURL("release-note.html"));
  return await response.text();
}
