import { NativeClipperLibRequestedFormat, loadNativeClipperLibInstanceAsync } from "js-angusj-clipper/web";
import { useCallback, useEffect, useState } from "react";
import { PatternBookApp } from "@/apps/patternBook";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App(): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const loadClipper = useCallback(async () => {
    const instance = await loadNativeClipperLibInstanceAsync(NativeClipperLibRequestedFormat.WasmWithAsmJsFallback);
    (globalThis as unknown as { clipper: typeof instance }).clipper = instance;
    setLoading(false);
  }, []);

  useEffect(() => {
    loadClipper();
  }, [loadClipper]);

  return loading ? (
    <div className="flex items-center justify-center p-10">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
    </div>
  ) : (
    <>
      <PatternBookApp />
      <ToastContainer position="bottom-right" />
    </>
  );
}

export default App;
