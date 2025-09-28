# Auto-generated color variables from matugen
# Do not edit manually - this file is regenerated on theme changes
# Source this file in your config.fish

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
set -gx COLOR_ERROR_CONTAINER {{colors.error_container.default.hex_stripped}}
set -gx COLOR_ON_ERROR_CONTAINER {{colors.on_error_container.default.hex_stripped}}
set -gx COLOR_SURFACE {{colors.surface.default.hex_stripped}}
set -gx COLOR_ON_SURFACE {{colors.on_surface.default.hex_stripped}}
set -gx COLOR_SURFACE_VARIANT {{colors.surface_variant.default.hex_stripped}}
set -gx COLOR_ON_SURFACE_VARIANT {{colors.on_surface_variant.default.hex_stripped}}
set -gx COLOR_SURFACE_CONTAINER {{colors.surface_container.default.hex_stripped}}
set -gx COLOR_SURFACE_CONTAINER_LOW {{colors.surface_container_low.default.hex_stripped}}
set -gx COLOR_SURFACE_CONTAINER_LOWEST {{colors.surface_container_lowest.default.hex_stripped}}
set -gx COLOR_SURFACE_CONTAINER_HIGH {{colors.surface_container_high.default.hex_stripped}}
set -gx COLOR_SURFACE_CONTAINER_HIGHEST {{colors.surface_container_highest.default.hex_stripped}}
set -gx COLOR_SURFACE_DIM {{colors.surface_dim.default.hex_stripped}}
set -gx COLOR_SURFACE_BRIGHT {{colors.surface_bright.default.hex_stripped}}
set -gx COLOR_OUTLINE {{colors.outline.default.hex_stripped}}
set -gx COLOR_OUTLINE_VARIANT {{colors.outline_variant.default.hex_stripped}}
set -gx COLOR_SHADOW {{colors.shadow.default.hex_stripped}}
set -gx COLOR_SCRIM {{colors.scrim.default.hex_stripped}}
set -gx COLOR_INVERSE_SURFACE {{colors.inverse_surface.default.hex_stripped}}
set -gx COLOR_INVERSE_ON_SURFACE {{colors.inverse_on_surface.default.hex_stripped}}
set -gx COLOR_INVERSE_PRIMARY {{colors.inverse_primary.default.hex_stripped}}
set -gx COLOR_BACKGROUND {{colors.background.default.hex_stripped}}
set -gx COLOR_ON_BACKGROUND {{colors.on_background.default.hex_stripped}}

# Legacy aliases for compatibility
set -gx COLOR_ACCENT {{colors.primary.default.hex_stripped}}
set -gx COLOR_ACCENT_GREEN {{colors.tertiary.default.hex_stripped}}
set -gx COLOR_GREEN {{colors.tertiary.default.hex_stripped}}
set -gx COLOR_BG {{colors.surface.default.hex_stripped}}
set -gx COLOR_FG {{colors.on_surface.default.hex_stripped}}
set -gx COLOR_BG_SECONDARY {{colors.surface_container.default.hex_stripped}}
set -gx COLOR_BG_TERTIARY {{colors.surface_container_high.default.hex_stripped}}

# Fish shell color configuration
if status is-interactive
    set -g fish_color_command {{colors.primary.default.hex_stripped}}
    set -g fish_color_param {{colors.on_surface.default.hex_stripped}}
    set -g fish_color_error {{colors.error.default.hex_stripped}}
    set -g fish_color_quote {{colors.tertiary.default.hex_stripped}}
    set -g fish_color_redirection {{colors.secondary.default.hex_stripped}}
    set -g fish_color_comment {{colors.outline.default.hex_stripped}}
    set -g fish_color_autosuggestion {{colors.outline.default.hex_stripped}}
    set -g fish_color_selection --background={{colors.surface_container.default.hex_stripped}}
    set -g fish_color_search_match --background={{colors.primary.default.hex_stripped}}
    set -g fish_color_valid_path {{colors.tertiary.default.hex_stripped}}
    set -g fish_color_operator {{colors.secondary.default.hex_stripped}}
    set -g fish_pager_color_completion {{colors.on_surface.default.hex_stripped}}
    set -g fish_pager_color_description {{colors.outline.default.hex_stripped}}
    set -g fish_pager_color_prefix {{colors.primary.default.hex_stripped}}
    set -g fish_pager_color_progress {{colors.tertiary.default.hex_stripped}}
    set -g fish_pager_color_selected_background --background={{colors.surface_container.default.hex_stripped}}
end