// The 59 stellations of the icosahedron (Coxeter, Du Val, Flather and
// Petrie, "The Fifty-Nine Icosahedra", 1938), in the order and notation of
// Wikipedia's "The Fifty-Nine Icosahedra":
//   index    Crennell index (1-59); 33-59 are chiral, right-handed form
//   cells    Coxeter's cell notation; in the chiral ones f1 is one
//            enantiomorphic half ("italic f1")
//   faces    regions of the stellation diagram on the surface; ' marks a
//            region seen from underneath
//   wenninger, wheeler, bruckner  other catalogues, when the stellation is in them
//   name     common name, when it has one

const rows = [
  [1, 'A', "0", 'W4 Icosahedron', '1 Regular convex triangular', null, 'Icosahedron'],
  [2, 'B', "1", 'W26 Triakis icosahedron', '2 Hexagonal', 'Taf. VIII, Fig. 2', 'Small triambic icosahedron'],
  [3, 'C', "2", 'W23 Compound of five octahedra', '3 Five intersecting octahedra', 'Taf. IX, Fig. 6', 'Compound of five octahedra'],
  [4, 'D', "3 4", null, '4 Nonagonal', 'Taf. IX, Fig. 17', null],
  [5, 'E', "5 6 7", null, null, null, null],
  [6, 'F', "8 9 10", 'W27 Second stellation', '19 Triple 13+6+7', null, 'Second stellation'],
  [7, 'G', "11 12", 'W41 Great icosahedron', '11 Regular star Poinsot', 'Taf. XI, Fig. 24', 'Great icosahedron'],
  [8, 'H', "13", 'W42 Final stellation', '12 Complete', 'Taf. XI, Fig. 14', 'Final stellation (echidnahedron)'],
  [9, 'e1', "3' 5", 'W37 Twelfth stellation', null, null, 'Twelfth stellation'],
  [10, 'f1', "5' 6' 9 10", null, null, null, null],
  [11, 'g1', "10' 12", 'W29 Fourth stellation', '21 Discrete skeleton', null, 'Fourth stellation'],
  [12, 'e1f1', "3' 6' 9 10", null, null, null, null],
  [13, 'e1f1g1', "3' 6' 9 12", null, '20 Hollow, labyrinth', null, null],
  [14, 'f1g1', "5' 6' 9 12", null, null, null, null],
  [15, 'e2', "4' 6 7", null, null, null, null],
  [16, 'f2', "7' 8", null, '22 Discrete twelve-pointed, crown-rimmed group', null, null],
  [17, 'g2', "8' 9' 11", null, null, null, null],
  [18, 'e2f2', "4' 6 8", null, null, null, null],
  [19, 'e2f2g2', "4' 6 9' 11", null, null, null, null],
  [20, 'f2g2', "7' 9' 11", 'W30 Fifth stellation', null, null, 'Fifth stellation'],
  [21, 'De1', "4 5", 'W32 Seventh stellation', '10 Twenty-pointed, six-edged', null, 'Seventh stellation'],
  [22, 'Ef1', "7 9 10", 'W25 Compound of ten tetrahedra', '8 Ten intersecting tetrahedra', 'Taf. IX, Fig. 3', 'Compound of ten tetrahedra'],
  [23, 'Fg1', "8 9 12", 'W31 Sixth stellation', '17 Double 13+9', 'Taf. X, Fig. 3', 'Sixth stellation'],
  [24, 'De1f1', "4 6' 9 10", null, null, null, null],
  [25, 'De1f1g1', "4 6' 9 12", null, null, null, null],
  [26, 'Ef1g1', "7 9 12", 'W28 Third stellation', '9 Mobius (concave)', 'Taf. VIII, Fig. 26', 'Excavated dodecahedron'],
  [27, 'De2', "3 6 7", null, '5 Archimedian variety of no. 13', null, null],
  [28, 'Ef2', "5 6 8", null, '18 Double 13+10', 'Taf. IX, Fig. 20', null],
  [29, 'Fg2', "10 11", 'W33 Eighth stellation', '14 Archimedian variety 11', null, 'Eighth stellation'],
  [30, 'De2f2', "3 6 8", 'W34 Ninth stellation', '13 Kite archimedian variety no. 11', null, 'Medial triambic icosahedron'],
  [31, 'De2f2g2', "3 6 9' 11", null, null, null, null],
  [32, 'Ef2g2', "5 6 9' 11", null, null, null, null],
  [33, 'f1', "5' 6' 9 10", 'W35 Tenth stellation', null, null, 'Tenth stellation'],
  [34, 'e1f1', "3' 5 6' 9 10", 'W36 Eleventh stellation', null, null, 'Eleventh stellation'],
  [35, 'De1f1', "4 5 6' 9 10", null, null, null, null],
  [36, 'f1g1', "5' 6' 9 10' 12", null, null, null, null],
  [37, 'e1f1g1', "3' 5 6' 9 10' 12", 'W39 Fourteenth stellation', null, null, 'Fourteenth stellation'],
  [38, 'De1f1g1', "4 5 6' 9 10' 12", null, null, null, null],
  [39, 'f1g2', "5' 6' 8' 9' 10 11", null, null, null, null],
  [40, 'e1f1g2', "3' 5 6' 8' 9' 10 11", null, null, null, null],
  [41, 'De1f1g2', "4 5 6' 8' 9' 10 11", null, null, null, null],
  [42, 'f1f2g2', "5' 6' 7' 9' 10 11", null, null, null, null],
  [43, 'e1f1f2g2', "3' 5 6' 7' 9' 10 11", null, null, null, null],
  [44, 'De1f1f2g2', "4 5 6' 7' 9' 10 11", null, null, null, null],
  [45, 'e2f1', "4' 5' 6 7 9 10", 'W40 Fifteenth stellation', null, null, 'Fifteenth stellation'],
  [46, 'De2f1', "3 5' 6 7 9 10", null, null, null, null],
  [47, 'Ef1', "5 6 7 9 10", 'W24 Compound of five tetrahedra', '6, 7 Five intersecting tetrahedra', 'Taf. IX, Fig. 11', 'Compound of five tetrahedra'],
  [48, 'e2f1g1', "4' 5' 6 7 9 10' 12", null, null, null, null],
  [49, 'De2f1g1', "3 5' 6 7 9 10' 12", null, null, null, null],
  [50, 'Ef1g1', "5 6 7 9 10' 12", null, null, null, null],
  [51, 'e2f1f2', "4' 5' 6 8 9 10", 'W38 Thirteenth stellation', null, null, 'Thirteenth stellation'],
  [52, 'De2f1f2', "3 5' 6 8 9 10", null, null, null, null],
  [53, 'Ef1f2', "5 6 8 9 10", null, '15, 16 Double 13+7', null, null],
  [54, 'e2f1f2g1', "4' 5' 6 8 9 10' 12", null, null, null, null],
  [55, 'De2f1f2g1', "3 5' 6 8 9 10' 12", null, null, null, null],
  [56, 'Ef1f2g1', "5 6 8 9 10' 12", null, null, null, null],
  [57, 'e2f1f2g2', "4' 5' 6 9' 10 11", null, null, null, null],
  [58, 'De2f1f2g2', "3 5' 6 9' 10 11", null, null, null, null],
  [59, 'Ef1f2g2', "5 6 9' 10 11", null, null, null, null],
];

const catalog = rows.map(([index, cells, faces, wenninger, wheeler, bruckner, name]) => ({
  id: `stellation-${index}`,
  index,
  cells,
  chiral: index >= 33,
  faces,
  wenninger,
  wheeler,
  bruckner,
  name,
  title: name ?? `Stellation ${index}`,
  mainline: /^[A-H]$/.test(cells),
}));

export default catalog;
