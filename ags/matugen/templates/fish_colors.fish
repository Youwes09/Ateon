# Auto-generated color variables from matugen
# Do not edit manually - this file is regenerated on theme changes

# Export raw color variables
set -gx COLOR_PRIMARY {{colors.primary.default.hex_stripped}}
set -gx COLOR_ON_PRIMARY {{colors.on_primary.default.hex_stripped}}
set -gx COLOR_PRIMARY_CONTAINER {{colors.primary_container.default.hex_stripped}}
set -gx COLOR_ON_PRIMARY_CONTAINER {{colors.on_primary_container.default.hex_stripped}}
set -gx COLOR_SECONDARY {{colors.secondary.default.hex_stripped}}
set -gx COLOR_ON_SECONDARY {{colors.on_secondary.default.hex_stripped}}
set -gx COLOR_SECONDARY_CONTAINER {{colors.secondary_container.default.hex_stripped}}
set -gx COLOR_ON_SECONDARY_CONTAINER {{colors.on_secondary_container.default.hex_stripped}}
set -gx COLOR_TERTIARY {{colors.tertiary.default.hex_stripped}}
set -gx COLOR_ON_TERTIARY {{colors.on_tertiary.default.hex_stripped}}
set -gx COLOR_TERTIARY_CONTAINER {{colors.tertiary_container.default.hex_stripped}}
set -gx COLOR_ON_TERTIARY_CONTAINER {{colors.on_tertiary_container.default.hex_stripped}}
set -gx COLOR_ERROR {{colors.error.default.hex_stripped}}
set -gx COLOR_ON_ERROR {{colors.on_error.default.hex_stripped}}
set -gx COLOR_SURFACE {{colors.surface.default.hex_stripped}}
set -gx COLOR_ON_SURFACE {{colors.on_surface.default.hex_stripped}}
set -gx COLOR_SURFACE_VARIANT {{colors.surface_variant.default.hex_stripped}}
set -gx COLOR_OUTLINE {{colors.outline.default.hex_stripped}}
set -gx COLOR_BACKGROUND {{colors.background.default.hex_stripped}}
set -gx COLOR_ON_BACKGROUND {{colors.on_background.default.hex_stripped}}

# Fallback: If primary/tertiary look like brown/gray, use a default accent (e.g., #b48ead - purple)
function color_fallback
    set color $argv[1]
    # Check if color is brownish or grayish (very rough check; improve as needed)
    if string match -r '^#([89a-f][89a-f][89a-f][89a-f][89a-f][89a-f])$' $color
        echo "#b48ead" # fallback purple
    else
        echo $color
    end
end

# Themed Fish shell colors
if status is-interactive
    set -g fish_color_command (color_fallback $COLOR_PRIMARY)
    set -g fish_color_param $COLOR_ON_SURFACE
    set -g fish_color_error $COLOR_ERROR
    set -g fish_color_quote (color_fallback $COLOR_TERTIARY)
    set -g fish_color_redirection $COLOR_SECONDARY
    set -g fish_color_comment $COLOR_OUTLINE
    set -g fish_color_autosuggestion $COLOR_OUTLINE
    set -g fish_color_selection --background=$COLOR_SURFACE
    set -g fish_color_search_match --background=(color_fallback $COLOR_PRIMARY)
    set -g fish_color_valid_path (color_fallback $COLOR_TERTIARY)
    set -g fish_color_operator $COLOR_SECONDARY
    set -g fish_pager_color_completion $COLOR_ON_SURFACE
    set -g fish_pager_color_description $COLOR_OUTLINE
    set -g fish_pager_color_prefix (color_fallback $COLOR_PRIMARY)
    set -g fish_pager_color_progress (color_fallback $COLOR_TERTIARY)
    set -g fish_pager_color_selected_background --background=$COLOR_SURFACE
end