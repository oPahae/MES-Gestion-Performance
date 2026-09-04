```jsx
import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import "../styles/globals.css";
import Sidebar from "../components/Sidebar";

const NO_SIDEBAR_PATHS = ["/login", "/"];

function getSidebarConfig(pathname) {
  if (pathname.startsWith("/dashboard")) {
    return { variant: "dashboard", compact: true };
  }

  if (pathname === "/supervision") {
    return { variant: "supervision", compact: true };
  }

  if (pathname === "/prediction") {
    return { variant: "prediction", compact: true };
  }

  if (pathname === "/settings") {
    return { variant: "settings", compact: false };
  }

  if (pathname === "/rp" || pathname === "/probleme") {
    return { variant: "rp", compact: false };
  }

  if (pathname === "/chat") {
    return { variant: "chat", compact: false };
  }

  if (pathname === "/notifications") {
    return { variant: "notifications", compact: false };
  }

  if (pathname === "/workflow") {
    return { variant: "workflow", compact: false };
  }

  return { variant: "rp", compact: false };
}

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(true);

  const handleFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (e) {
      console.error(e);
    }

    setShowPopup(false);
  };

  // Pages qui ne doivent jamais avoir le Sidebar
  const hideSidebar =
    NO_SIDEBAR_PATHS.includes(router.pathname) ||
    router.pathname.startsWith("/mobile/dashboard");

  const { variant, compact } = getSidebarConfig(
    router.pathname
  );

  const contentTextSize = compact
    ? "text-[6px]"
    : "text-xs";

  return (
    <>
      <Head>
        <link rel="icon" href="/logo.png" />
      </Head>

      {false && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 text-center">
            <h2 className="text-xl font-bold mb-2">
              Entrer en plein écran ?
            </h2>

            <p className="text-gray-600 mb-6">
              Pour une meilleure expérience, utilisez le
              mode plein écran.
            </p>

            <div className="flex justify-center gap-3">
              <button
                onClick={handleFullscreen}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Oui
              </button>

              <button
                onClick={() => setShowPopup(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Non
              </button>
            </div>
          </div>
        </div>
      )}

      {hideSidebar ? (
        <Component {...pageProps} />
      ) : (
        <div
          className={`w-screen h-screen overflow-hidden flex bg-[#EEF1F6] ${contentTextSize}`}
        >
          <Sidebar variant={variant} />

          <div className="flex-1 flex flex-col min-w-0">
            <Component {...pageProps} />
          </div>
        </div>
      )}
    </>
  );
}
```
