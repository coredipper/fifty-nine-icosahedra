# The Fifty-Nine Icosahedra

Interactive 3D models of the 59 stellations of the regular icosahedron,
enumerated by H. S. M. Coxeter, P. Du Val, H. T. Flather and J. F. Petrie in
*The Fifty-Nine Icosahedra* (1938). Numbering, cell notation and the face
sets follow Wikipedia's
[The Fifty-Nine Icosahedra](https://en.wikipedia.org/wiki/The_Fifty-Nine_Icosahedra).

## Run

Browsers block ES module imports from `file://` URLs, so serve the folder over HTTP:

```sh
npm start                  # http://localhost:8000 (Node 18+, no dependencies)
# or: python3 -m http.server 8000
```

The gallery (`index.html`) links to the viewer (`viewer.html?shape=stellation-<n>`).
Viewer controls: drag to rotate, scroll to zoom, `←` `→` for the previous or
next stellation. Buttons toggle auto-rotation, edges, and one colour per
face plane.

## How the shapes are computed

`js/geometry/stellation.js`:

1. The 20 face planes of the icosahedron cut space into cells. A point's
   cell is identified by its sign vector (inside or outside each plane);
   cells related by a symmetry form a cell type. This gives Coxeter's eleven
   types in eight shells, `a` to `h`, working outwards: `e`, `f` and `g`
   have two types each, and `f1` is the only chiral one.
2. Coxeter's notation is parsed into a set of cells: a capital letter means
   every shell up to it (`D` = a, b, c, d); lower-case names add one cell
   type. In the chiral stellations (33–59) `f1` means one of its two
   enantiomorphic halves.
3. In one face plane the other planes cut the stellation diagram. A diagram
   region is on the surface when the cell on one side is in the set and the
   cell on the other side is not. The plane is copied to the other 19 by
   rotations.

Which of the two `e` types is `e1` (and likewise `g1`) is not fixed by
geometry alone. The tests fix it: only one labelling reproduces the face
sets that Wikipedia lists for all 59 stellations.

## Tests

```sh
npm test
```

The tests check the symmetry group and the cell structure (8 shells, 11 cell
types, one chiral), that the computed surfaces of all 59 stellations use
exactly the diagram regions listed on Wikipedia, the icosahedron and the
compound of five tetrahedra, that stellations 1–32 are mirror symmetric and
33–59 are not, and the mesh data.

## Project layout

```
index.html, viewer.html    Gallery and viewer pages
css/styles.css
js/catalog.js              The 59 entries: cell notation, face sets, other catalogues
js/registry.js             Cell sets and descriptions for the pages
js/geometry/               Cells, stellation diagram, surfaces, mesh data
                           (no three.js dependency, so it runs in Node)
js/render.js               Shared three.js setup
js/index.js, js/viewer.js  Page scripts
scripts/serve.mjs          Local static server
vendor/three/              three.js 0.160.0 (unchanged copy from npm)
vendor/fonts/outfit/       Outfit variable font (unchanged copy from npm)
test/                      Geometry tests
```

## Tech

three.js 0.160.0 and the Outfit font (SIL OFL 1.1) are vendored; see the
README in each `vendor/` folder for source and hash. Vanilla ES modules, no
build step, no third-party requests.

## References

- H. S. M. Coxeter, P. Du Val, H. T. Flather, J. F. Petrie, *The Fifty-Nine
  Icosahedra*, University of Toronto Studies, Mathematical Series 6 (1938);
  3rd edition with the Crennell index, Tarquin (1999)
- Wikipedia: [The Fifty-Nine Icosahedra](https://en.wikipedia.org/wiki/The_Fifty-Nine_Icosahedra)
- M. J. Wenninger, *Polyhedron Models*, Cambridge University Press (1971)
