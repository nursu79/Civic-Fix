import dynamic from "next/dynamic";

export { LocationPicker } from "./LocationPicker";

export const MiniMap = dynamic(() => import("./MiniMap"), { ssr: false });

export const GeospatialMap = dynamic(
  () =>
    import("./GeospatialMap").then((mod) => ({ default: mod.GeospatialMap })),
  { ssr: false },
);
