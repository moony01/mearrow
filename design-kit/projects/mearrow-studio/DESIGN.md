# MEARROW Studio

## Direction
An editorial discovery product that connects K-pop news, auditions, fan voting, and MEARROW services. The interface balances a cinematic media banner with a light editorial canvas and compact information blocks.

## Web source
The server-rendered HTML and original compiled Next.js stylesheets are transferred from the current `/studio` route, with referenced assets stored locally. Desktop, tablet, and mobile layouts use the product's own responsive CSS. Runtime scripts are removed; editorial, ranking, and audition content is shown as a static portfolio snapshot.

## App concept
Native-style concept based on existing Studio information architecture. It has its own bottom navigation and screen flow: discovery, story detail, audition opportunity, and fan vote. These screens are design proposals, not implemented app functionality.

## Screen inventory
- Web: Studio home/banner, fan vote and news, audition discovery
- App: discovery home, news story, audition detail, fan vote

## Content boundary
Only public editorial data and local copies of current visual assets are included. No live ranking feed, video playback, account, voting, application submission, or external API is connected. The native-style app pages remain concepts because this repository has no implemented native app source.
