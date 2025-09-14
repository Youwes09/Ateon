import  app from "ags/gtk4/app";
export default function OsIcon() {
  return (
    <button onClicked={() => app.toggle_window("sidebar")}>
      <image iconName="arch-symbolic" cssClasses={["OsIcon"]} />
    </button>
  );
}