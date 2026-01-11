const makeDclMap = () => {
  const cells = [];

  const pushCell = (corridorId, dir, index, s0, s1, edgeId, conflictSet) => {
    cells.push({
      cellId: `${corridorId}#i=${index}#dir=${dir}`,
      corridorId,
      dir,
      corridorS0M: s0,
      corridorS1M: s1,
      spans: [{ edgeId, edgeS0M: s0, edgeS1M: s1 }],
      conflictSet
    });
  };

  const corridorAB = 'C:A-B';
  const corridorBC = 'C:B-C';

  // A-B cells (2 cells per direction).
  const abCells = [
    { index: 0, s0: 0, s1: 1 },
    { index: 1, s0: 1, s1: 2 }
  ];

  abCells.forEach((cell) => {
    const aToB = `${corridorAB}#i=${cell.index}#dir=A_TO_B`;
    const bToA = `${corridorAB}#i=${cell.index}#dir=B_TO_A`;
    pushCell(corridorAB, 'A_TO_B', cell.index, cell.s0, cell.s1, 'A-B', [aToB, bToA]);
    pushCell(corridorAB, 'B_TO_A', cell.index, cell.s0, cell.s1, 'A-B', [aToB, bToA]);
  });

  // B-C cells (single direction conflicts only with itself).
  const bcCells = [
    { index: 0, s0: 0, s1: 1 },
    { index: 1, s0: 1, s1: 2 }
  ];

  bcCells.forEach((cell) => {
    const cellId = `${corridorBC}#i=${cell.index}#dir=A_TO_B`;
    pushCell(corridorBC, 'A_TO_B', cell.index, cell.s0, cell.s1, 'B-C', [cellId]);
  });

  return {
    nodes: [
      { nodeId: 'A', pos: { xM: 0, yM: 0 } },
      { nodeId: 'B', pos: { xM: 2, yM: 0 } },
      { nodeId: 'C', pos: { xM: 4, yM: 0 } }
    ],
    edges: [
      { edgeId: 'A-B', startNodeId: 'A', endNodeId: 'B', props: { direction: 0 }, lengthM: 2 },
      { edgeId: 'B-C', startNodeId: 'B', endNodeId: 'C', props: { direction: 0 }, lengthM: 2 }
    ],
    corridors: [
      {
        corridorId: corridorAB,
        aNodeId: 'A',
        bNodeId: 'B',
        lengthM: 2,
        singleLane: true,
        segments: [{ edgeId: 'A-B', corridorS0M: 0, corridorS1M: 2, aligned: true }]
      },
      {
        corridorId: corridorBC,
        aNodeId: 'B',
        bNodeId: 'C',
        lengthM: 2,
        singleLane: false,
        segments: [{ edgeId: 'B-C', corridorS0M: 0, corridorS1M: 2, aligned: true }]
      }
    ],
    cells,
    nodeStopZones: [
      {
        nodeId: 'B',
        radiusM: 1,
        capacity: 1,
        conflictCells: [
          `${corridorAB}#i=1#dir=A_TO_B`,
          `${corridorAB}#i=1#dir=B_TO_A`,
          `${corridorBC}#i=0#dir=A_TO_B`
        ]
      }
    ]
  };
};

module.exports = { makeDclMap };
