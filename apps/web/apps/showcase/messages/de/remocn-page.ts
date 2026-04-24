export const remocnPage = {
  eyebrow: 'Registry-Komponenten',
  subeyebrow: 'Per CLI von remocn.dev installiert',
  title: 'Eine remocn-Showcase-Route innerhalb der bestehenden App-Shell.',
  description:
    'Diese Seite bettet remocn-Primitives direkt in die TanStack-Start-App ein. Die Komponenten wurden aus der offiziellen Registry gezogen und im Browser mit dem Remotion-Player gerendert.',
  supportingCopy:
    'remocn ist primär für Remotion-Projekte dokumentiert. In diesem Repo werden dieselben Bausteine als interaktive Vorschau eingebunden, damit sich die Motion-Sprache direkt in der App beurteilen lässt.',
  actions: {
    catalog: 'Komponenten-Katalog öffnen',
    installation: 'Installationsanleitung öffnen',
  },
  stats: {
    components: 'Registry-Komponenten per shadcn importiert',
    registryFlow: 'Installationsablauf direkt aus der Doku übernommen',
    browserPreview: 'Browser-Vorschauen mit @remotion/player',
  },
  cards: {
    terminal: {
      eyebrow: 'UI-Block',
      title: 'TerminalSimulator',
      description:
        'Eine CLI-Vorschau des Installationsablaufs, damit der Registry-Flow konkret statt abstrakt wirkt.',
    },
    blur: {
      eyebrow: 'Typografie',
      title: 'BlurReveal',
      description:
        'Ein starker Unschärfe-zu-Scharf-Textauftritt für Hero-Texte, Intros und Produktnamen.',
    },
    matrix: {
      eyebrow: 'Typografie',
      title: 'MatrixDecode',
      description:
        'Ein dekodierender Texteffekt mit technischer Anmutung für Launch-Sequenzen und Statusanzeigen.',
    },
    spotlight: {
      eyebrow: 'Umgebung & Licht',
      title: 'SpotlightCard',
      description:
        'Ein synthetischer Cursor zieht ein weiches Licht über die Karte und lässt den Rand lebendig wirken.',
    },
  },
  install: {
    title: 'CLI-Befehl',
    description:
      'Diese remocn-Komponenten wurden über den Registry-Flow in das Repo übernommen. Anschließend werden sie auf der Seite mit dem Browser-Player statt in einer separaten Video-Composition gerendert.',
  },
  integration: {
    title: 'Integrationshinweise',
    pointOne:
      'Die Registry-Komponenten selbst kamen über die offizielle shadcn-kompatible CLI ins Projekt.',
    pointTwo:
      'Da dieses Repository eine Website und kein dediziertes Remotion-Projekt ist, laufen die Vorschauen über @remotion/player.',
    pointThree:
      'Die Route bleibt lokalisiert und lebt innerhalb der vorhandenen Navigation statt in einer separaten Demo-App.',
  },
};
