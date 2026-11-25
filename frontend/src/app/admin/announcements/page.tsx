"use client";
import { AnnouncementBoard } from "@/components/admin/AnnouncementBoard";

export default function Page() {
  return (
    <>
      <div className="head"><div><h1>Announcements</h1><p>Messages arrive in users&apos; notification bell. Send to everyone, one role, one district or one upazila.</p></div><span className="code">Screen A7</span></div>
      <AnnouncementBoard />
    </>
  );
}
