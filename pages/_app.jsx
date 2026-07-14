import { useState } from "react";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  const [showPopup, setShowPopup] = useState(true);

  const handleFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (e) {
      console.error(e);
    }

    setShowPopup(false);
  };

  return (
    <>
      {false && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 text-center">
            <h2 className="text-xl font-bold mb-2">
              Entrer en plein écran ?
            </h2>

            <p className="text-gray-600 mb-6">
              Pour une meilleure expérience, utilisez le mode plein écran.
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

      <Component {...pageProps} />
    </>
  );
}