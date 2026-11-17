import { FieldScene, Sprout } from "./Art";

export function AuthArt() {
  return (
    <div className="auth-art">
      <div>
        <div className="brand" style={{ marginBottom: 36 }}><Sprout size={34} /><div><b>FreshNest</b><span>Farm-gate market</span></div></div>
        <h2>Sell straight from the field. Buy fresh, move it fast.</h2>
        <p>Farmers, dealers and transport providers across Bangladesh trade in one place, down to the upazila.</p>
        <ul>
          <li>Farmers list produce and get the best price through open bidding or their own price.</li>
          <li>Verified dealers buy whole lots and confirm a trusted transport offer.</li>
          <li>If a vehicle gets stuck, an emergency sale saves the produce nearby.</li>
        </ul>
      </div>
      <FieldScene />
    </div>
  );
}
