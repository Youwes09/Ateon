# Display fastfetch on startup (only for interactive shells)
if status is-interactive && not set -q TMUX && test "$TERM_PROGRAM" != "vscode"
    if command -v fastfetch >/dev/null 2>&1
        fastfetch
        echo
    end
end

# Initialize Starship prompt
if command -v starship >/dev/null 2>&1
    starship init fish | source
end

# Disable fish greeting
set -g fish_greeting ""

# Basic aliases
alias ll='ls -la'
alias la='ls -A'
alias ..='cd ..'

# Function for home directory
function cdh
    cd ~
end

# Load matugen colors and apply them to fish and terminal
if status is-interactive
    # Load color environment variables and fish colors from matugen
    if test -f ~/.config/chromash/colors/current.fish
        source ~/.config/chromash/colors/current.fish
    else
        echo "Warning: Matugen colors not found. Run 'matugen -c ~/.config/ags/matugen/config.toml image /path/to/wallpaper' to generate them."
    end
    
    # Apply terminal escape sequences for dynamic theming
    if set -q COLOR_BACKGROUND && set -q COLOR_ON_BACKGROUND && set -q COLOR_PRIMARY
        # Set cursor color
        printf "\e]12;#$COLOR_PRIMARY\a"
        # Set background color  
        printf "\e]11;#$COLOR_BACKGROUND\a"
        # Set foreground color
        printf "\e]10;#$COLOR_ON_BACKGROUND\a"
    end
    
    # For jumping between prompts in foot terminal (OSC 133 support)
    function mark_prompt_start --on-event fish_prompt
        echo -en "\e]133;A\e\\"
    end
end

# Matugen integration functions
function matugen-reload
    echo "Reloading matugen colors..."
    if test -f ~/.config/chromash/colors/current.fish
        source ~/.config/chromash/colors/current.fish
        echo "Colors reloaded. Restart terminal for foot config changes."
    else
        echo "No matugen colors found. Generate them first with 'matugen -c ~/.config/ags/matugen/config.toml image /path/to/wallpaper'"
    end
end

function matugen-status
    if set -q COLOR_PRIMARY
        echo "Matugen colors loaded:"
        echo "  Primary: #$COLOR_PRIMARY"
        echo "  Surface: #$COLOR_SURFACE" 
        echo "  On Surface: #$COLOR_ON_SURFACE"
        if set -q fish_color_command
            echo "Fish shell colors: Applied"
        else
            echo "Fish shell colors: Not applied"
        end
    else
        echo "Matugen colors not loaded"
    end
end

function matugen-generate
    if test (count $argv) -eq 0
        echo "Usage: matugen-generate /path/to/wallpaper"
        return 1
    end
    
    if not test -f $argv[1]
        echo "Error: File '$argv[1]' not found"
        return 1
    end
    
    echo "Generating theme from $argv[1]..."
    matugen -c ~/.config/ags/matugen/config.toml image $argv[1]
    
    if test $status -eq 0
        echo "Theme generated successfully!"
        echo "Reloading colors..."
        matugen-reload
    else
        echo "Error generating theme"
        return 1
    end
end

# Legacy chromash functions for compatibility
function chromash-reload
    matugen-reload
end

function chromash-status  
    matugen-status
end