autoload -Uz vcs_info
autoload -U colors && colors

main() {
	set_local
	set_prompt
	set_aliases
	set_fnm
	set_autosuggestions
}

set_local() {
	export LOCAL_ROOT=~/Documents/development
}

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
	alias env-make="make -f $LOCAL_ROOT/self/environment/Makefile"
	alias gh-init=" \
		git init \
		&& git commit \
			-m 'init repo' \
			--allow-empty \
		&& gh repo create"
	alias gl="glab"
	alias me="node ~/Documents/development/self/me/bin/me.js"
}

set_fnm() {
	eval "$(fnm env)"
}

set_autosuggestions() {
	source $HOMEBREW_PREFIX/share/zsh-autosuggestions/zsh-autosuggestions.zsh
}

main
