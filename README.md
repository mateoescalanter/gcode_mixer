# GCode Mixer

Hi, this is a personal project that I use for mixing gcode files generated with Cura Slicer. You can use the webapp directly at [gcodemixer.mer.bio](https://gcodemixer.mer.bio) or you can fork it.



## Why?

Sometimes you have 3D models that would benefit from being sliced at different heights with different settings, and even though you can use a slicing mesh in Cura's "Modify settings for overlaps", sometimes it just doesn't work or isn't supported.

I usually use this tool with models that I want to be spiralized (vase mode) in certain areas, or to selectively use the "Make Overhangs Printable" setting.

## How?

- Upload your sliced G-code files of the same model
- Add them to the 3D viewer
- Move the layer timeline to match your desired configuration
- Download merged g-code

## Getting Started (run it locally)

### Prerequisites

- Node.js 18.x or later
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mateoescalanter/gcode_mixer.git
cd gcode_mixer
```

2. Install dependencies:
```bash
pnpm install
```

3. Run the development server:
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Deployment (Vercel)

### Deploying to Vercel

1. Fork this repository
2. Create a new project on Vercel
3. Import your forked repository
4. Deploy!

The deployment will be automatic on every push to the main branch.

## Contributing

This is a personal project that I've made available for others to use and modify. While I'm not actively maintaining it or accepting pull requests, you're welcome to fork the repository and make your own changes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/) 