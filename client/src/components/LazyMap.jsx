import { lazy, Suspense } from "react";

// The map code is loaded only when a map is shown, so other pages stay light
const Picker = lazy(() => import("./MapPicker"));
const View = lazy(() => import("./MapView"));

const Loading = ({ height }) => (
  <div className="mf-map-loading" style={{ height }}>Loading map…</div>
);

export function LazyMapPicker(props) {
  return <Suspense fallback={<Loading height={props.height || 300} />}><Picker {...props} /></Suspense>;
}

export function LazyMapView(props) {
  return <Suspense fallback={<Loading height={props.height || 340} />}><View {...props} /></Suspense>;
}
