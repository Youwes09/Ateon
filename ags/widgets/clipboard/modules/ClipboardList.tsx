import { Gtk } from "ags/gtk4";
import { clipboard } from "utils/clipboard";
import GLib from "gi://GLib";
import Gdk from "gi://Gdk";

export function ClipboardList() {
  let listBox: Gtk.Box | null = null;

  const createImageEntry = (entry: any, id: string): Gtk.Widget => {
    try {
      const texture = Gdk.Texture.new_from_filename(entry.imagePath);
      
      // Better scaling logic - constrain to container width
      const containerWidth = 550; // Slightly less than window width for padding
      const maxHeight = 300;
      const imgWidth = texture.get_width();
      const imgHeight = texture.get_height();
      
      // Scale down large images, but don't scale up small ones
      let displayWidth = imgWidth;
      let displayHeight = imgHeight;
      
      if (imgWidth > containerWidth || imgHeight > maxHeight) {
        const ratio = Math.min(containerWidth / imgWidth, maxHeight / imgHeight);
        displayWidth = Math.floor(imgWidth * ratio);
        displayHeight = Math.floor(imgHeight * ratio);
      }
      
      return new Gtk.Picture({
        paintable: texture,
        can_shrink: true,
        content_fit: Gtk.ContentFit.CONTAIN,
        width_request: displayWidth,
        height_request: displayHeight,
        css_classes: ["entry-image"],
      });
    } catch (e) {
      console.error(`Failed to load thumbnail ${entry.imagePath}:`, e);
      return new Gtk.Label({
        label: `${id} || [Image - failed to load]`,
        ellipsize: 3,
        xalign: 0,
        hexpand: true,
        css_classes: ["entry-text"],
      });
    }
  };

  const createTextEntry = (id: string, content: string): Gtk.Widget => {
    const displayText = `${id} || ${content.length > 80 ? content.slice(0, 77) + "..." : content}`;
    return new Gtk.Label({
      label: displayText,
      ellipsize: 3,
      xalign: 0,
      hexpand: true,
      css_classes: ["entry-text"],
    });
  };

  const createImageTextEntry = (id: string, imageType: string): Gtk.Widget => {
    return new Gtk.Label({
      label: `${id} || [Image: ${imageType}]`,
      ellipsize: 3,
      xalign: 0,
      hexpand: true,
      css_classes: ["entry-text"],
    });
  };

  const rebuild = () => {
    if (!listBox) return;
    
    // Clear existing children
    let child = listBox.get_first_child();
    while (child) {
      const next = child.get_next_sibling();
      listBox.remove(child);
      child = next;
    }

    // Handle empty state
    if (clipboard.filtered.length === 0) {
      listBox.append(new Gtk.Label({
        label: clipboard.query ? "No matching entries" : "No clipboard entries",
        css_classes: ["no-entries"],
      }));
      return;
    }

    // Build entry list
    clipboard.filtered.forEach((entry, i) => {
      const [id, ...contentParts] = entry.content.split('\t');
      const content = contentParts.join('\t');
      const isSelected = clipboard.index === i;
      
      const button = new Gtk.Button({
        css_classes: [
          "clipboard-entry",
          ...(entry.isImage && clipboard.showImages ? ["image-entry"] : []),
          ...(isSelected ? ["selected"] : [])
        ],
      });
      
      button.connect("clicked", () => {
        clipboard.index = i;
        clipboard.select(i).catch(console.error);
      });

      // Mouse hover handler
      const motionController = new Gtk.EventControllerMotion();
      motionController.connect("enter", () => {
        if (clipboard.index !== i) {
          clipboard.index = i;
          GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            clipboard.triggerUpdate();
            return false;
          });
        }
      });
      button.add_controller(motionController);

      // Build row content
      const row = new Gtk.Box({ 
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 12,
      });

      // Add appropriate content based on entry type
      if (entry.isImage && entry.imagePath && clipboard.showImages) {
        row.append(createImageEntry(entry, id));
      } else if (entry.isImage) {
        row.append(createImageTextEntry(id, entry.imageType || "binary data"));
      } else {
        row.append(createTextEntry(id, content));
      }

      // Add delete icon if in delete mode
      if (clipboard.mode === "delete") {
        row.append(new Gtk.Label({ 
          label: "delete_forever", 
          css_classes: ["delete-icon"] 
        }));
      }

      button.set_child(row);
      listBox.append(button);
    });
  };

  clipboard.addUpdateCallback(rebuild);

  return (
    <scrolledwindow 
      cssClasses={["clipboard-list"]} 
      vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC} 
      hscrollbarPolicy={Gtk.PolicyType.NEVER} 
      maxContentHeight={400} 
      propagateNaturalHeight
    >
      <box 
        orientation={Gtk.Orientation.VERTICAL} 
        $={(self) => { 
          listBox = self; 
          setTimeout(() => clipboard.load(), 100); 
        }} 
      />
    </scrolledwindow>
  );
}