autoload -Uz vcs_info
autoload -U colors && colors

set_prompt() {
	precmd() {
		vcs_info
	}
	zstyle ":vcs_info:git:*" formats " on %{$fg[magenta]%}%b%{$reset_color%}"
	setopt prompt_subst
	indent=$'\n$ '
	prompt='%{$fg[green]%}${PWD/#$HOME/~}%{$reset_color%}${vcs_info_msg_0_}${indent}'
}

set_aliases() {
	alias gh-init=" \
		git init \
		&& git commit \
			-m 'init repo' \
			--allow-empty \
		&& gh repo create"
	alias gl="glab"
	alias me="node ~/Documents/development/self/me/bin/me.js"
	alias sudo="sudo "
}

set_fnm() {
	eval "$(fnm env)"
}

set_autosuggestions() {
	source $HOMEBREW_PREFIX/share/zsh-autosuggestions/zsh-autosuggestions.zsh
}

set_prompt
set_aliases
set_fnm
set_autosuggestions
