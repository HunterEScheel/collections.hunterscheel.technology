import { useState } from 'react';

/**
 * The phone app is where the kitchen is actually kept up to date — you edit it
 * standing at the shelf, offline. The APK is the debug build of whatever is on
 * main, published by CI to a fixed release tag so this link never goes stale.
 */
const APK_URL =
  'https://github.com/HunterEScheel/mtg-collection-search/releases/download/android-latest/my-kitchen.apk';

export function AndroidDownload() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <section className="rounded-lg bg-zinc-900 p-4 ring-1 ring-zinc-800">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-2xl">🤖</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium">Get the Android app</h2>
          <p className="text-sm text-zinc-400">
            Add and edit items, keep recipes, and work with no signal. It syncs to this
            same account.
          </p>
        </div>
        <a
          href={APK_URL}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium hover:bg-indigo-500"
        >
          Download APK
        </a>
      </div>

      <button
        onClick={() => setShowHelp((open) => !open)}
        className="mt-2 text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
      >
        {showHelp ? 'Hide install steps' : 'How do I install this?'}
      </button>

      {showHelp && (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-zinc-400">
          <li>Open this page on the phone and tap Download APK.</li>
          <li>
            Android will ask whether to allow installs from your browser — that prompt is
            expected for an app that did not come from the Play Store.
          </li>
          <li>Open the downloaded file to install, then sign in with this same email.</li>
          <li>
            It is a debug build signed with the standard debug key, so Play Protect may
            warn about an unknown developer.
          </li>
        </ol>
      )}
    </section>
  );
}
