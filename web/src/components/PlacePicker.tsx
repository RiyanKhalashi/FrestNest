"use client";
import { useEffect, useState } from "react";
import { api, type District } from "@/lib/api";

/** District → upazila dropdowns. Calls onChange with the chosen upazila id (or 0). */
export function PlacePicker({ value, onChange, bad }: { value: number; onChange: (upazilaId: number) => void; bad?: boolean }) {
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtId, setDistrictId] = useState(0);

  useEffect(() => {
    api<{ districts: District[] }>("/meta/locations").then((r) => {
      setDistricts(r.districts);
      if (value) { const d = r.districts.find((x) => x.upazilas.some((u) => u.id === value)); if (d) setDistrictId(d.id); }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ups = districts.find((d) => d.id === districtId)?.upazilas ?? [];
  return (
    <div className="row">
      <div className="field"><label htmlFor="dist">District</label>
        <select id="dist" value={districtId} onChange={(e) => { setDistrictId(+e.target.value); onChange(0); }} className={bad && !districtId ? "bad" : ""}>
          <option value={0}>Choose district</option>
          {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select></div>
      <div className="field"><label htmlFor="upa">Upazila</label>
        <select id="upa" value={value} onChange={(e) => onChange(+e.target.value)} disabled={!districtId} className={bad && !value ? "bad" : ""}>
          <option value={0}>{districtId ? "Choose upazila" : "Choose district first"}</option>
          {ups.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select></div>
    </div>
  );
}
