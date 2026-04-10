import { NativeClipperLibRequestedFormat, loadNativeClipperLibInstanceAsync } from "js-angusj-clipper/web";
import { useCallback, useEffect, useState } from "react";
import Main from "./app";

function App() {
  const [loading, setLoading] = useState(true);
  const loadClipper = useCallback(async () => {
    const instance = await loadNativeClipperLibInstanceAsync(NativeClipperLibRequestedFormat.WasmWithAsmJsFallback);
    // @ts-ignore
    window.clipper = instance;
    setLoading(false);
  }, []);

  useEffect(() => {
    loadClipper();
  }, []);

  return loading ? (
    <div className="flex items-center justify-center p-10">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
    </div>
  ) : (
    <Main />
  );
}

export default App;
