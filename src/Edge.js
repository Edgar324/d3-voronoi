import {cells, edges, vertices, epsilon} from "./Diagram";

export function createVertex(x, y) {
  var index = vertices.push([x, y]) - 1;
  return index;
}

export function createEdge(left, right, v0, v1) {
  var edge = [null, null],
      index = edges.push(edge) - 1;
  v0 = (typeof v0 !== 'undefined') ? v0 : null;
  v1 = (typeof v1 !== 'undefined') ? v1 : null;
  edge.left = left;
  edge.right = right;
  if (v0 !== null) setEdgeEnd(edge, left, right, v0);
  if (v1 !== null) setEdgeEnd(edge, right, left, v1);
  cells[left.index].halfedges.push(index);
  cells[right.index].halfedges.push(index);

  return edge;
}

export function createBorderEdge(left, v0, v1) {
  v0 = (typeof v0 !== 'undefined') ? v0 : null;
  v1 = (typeof v1 !== 'undefined') ? v1 : null;
  var edge = [v0, v1];
  edge.left = left;
  return edge;
}

export function setEdgeEnd(edge, left, right, vertex) {
  vertex = (typeof vertex !== 'undefined') ? vertex : null;
  if (edge[0] === null && edge[1] === null) {
    edge[0] = vertex;
    edge.left = left;
    edge.right = right;
  } else if (edge.left === right) {
    edge[1] = vertex;
  } else {
    edge[0] = vertex;
  }
}

// Liang–Barsky line clipping.
function clipEdge(edge, x0, y0, x1, y1) {
  //console.log("Begin clip edge %d, %d : %d, %d", vertices[edge[0]][0], vertices[edge[0]][1], vertices[edge[1]][0], vertices[edge[1]][1]);

  var a = vertices[edge[0]],
      b = vertices[edge[1]],
      ax = a[0],
      ay = a[1],
      bx = b[0],
      by = b[1],
      t0 = 0,
      t1 = 1,
      dx = bx - ax,
      dy = by - ay,
      r;

  r = x0 - ax;
  if (!dx && r > 0) return;
  r /= dx;
  if (dx < 0) {
    if (r < t0) return;
    if (r < t1) t1 = r;
  } else if (dx > 0) {
    if (r > t1) return;
    if (r > t0) t0 = r;
  }

  r = x1 - ax;
  if (!dx && r < 0) return;
  r /= dx;
  if (dx < 0) {
    if (r > t1) return;
    if (r > t0) t0 = r;
  } else if (dx > 0) {
    if (r < t0) return;
    if (r < t1) t1 = r;
  }

  r = y0 - ay;
  if (!dy && r > 0) return;
  r /= dy;
  if (dy < 0) {
    if (r < t0) return;
    if (r < t1) t1 = r;
  } else if (dy > 0) {
    if (r > t1) return;
    if (r > t0) t0 = r;
  }

  r = y1 - ay;
  if (!dy && r < 0) return;
  r /= dy;
  if (dy < 0) {
    if (r > t1) return;
    if (r > t0) t0 = r;
  } else if (dy > 0) {
    if (r < t0) return;
    if (r < t1) t1 = r;
  }

  if (!(t0 > 0) && !(t1 < 1)) return true; // TODO Better check?

  if (t0 > 0) {
    edge[0] = createVertex(ax + t0 * dx, ay + t0 * dy);
  }
  if (t1 < 1) {
    edge[1] = createVertex(ax + t1 * dx, ay + t1 * dy);
  }

  //console.log("Clip edge %d, %d : %d, %d", vertices[edge[0]][0], vertices[edge[0]][1], vertices[edge[1]][0], vertices[edge[1]][1]);

  return true;
}

function connectEdge(edge, x0, y0, x1, y1) {
  var vertex1 = edge[1];
  if (vertex1 !== null) return true;
  var v1;

  var vertex0 = edge[0],
      v0,
      left = edge.left,
      right = edge.right,
      lx = left[0],
      ly = left[1],
      rx = right[0],
      ry = right[1],
      fx = (lx + rx) / 2,
      fy = (ly + ry) / 2,
      fm,
      fb;
  if (vertex0 !== null) 
    v0 = vertices[vertex0];
  if (ry === ly) {
    if (fx < x0 || fx >= x1) return;
    if (lx > rx) {
      if (vertex0 === null) vertex0 = createVertex(fx, y0);
      else if (v0[1] >= y1) return;
      v1 = [fx, y1];
    } else {
      if (vertex0 === null) vertex0 = createVertex(fx, y1);
      else if (v0[1] < y0) return;
      v1 = [fx, y0];
    }
  } else {
    fm = (lx - rx) / (ry - ly);
    fb = fy - fm * fx;
    if (fm < -1 || fm > 1) {
      if (lx > rx) {
        if (vertex0 === null) vertex0 = createVertex((y0 - fb) / fm, y0);
        else if (v0[1] >= y1) return;
        v1 = [(y1 - fb) / fm, y1];
      } else {
        if (vertex0 === null) vertex0 = createVertex((y1 - fb) / fm, y1);
        else if (v0[1] < y0) return;
        v1 = [(y0 - fb) / fm, y0];
      }
    } else {
      if (ly < ry) {
        if (vertex0 === null) vertex0 = createVertex(x0, fm * x0 + fb);
        else if (v0[0] >= x1) return;
        v1 = [x1, fm * x1 + fb];
      } else {
        if (vertex0 === null) vertex0 = createVertex(x1, fm * x1 + fb);
        else if (v0[0] < x0) return;
        v1 = [x0, fm * x0 + fb];
      }
    }
  }

  edge[0] = vertex0;
  vertex1 = createVertex(v1[0], v1[1]);
  edge[1] = vertex1;
  //console.log("Connect edge %d, %d : %d, %d", vertices[vertex0][0], vertices[vertex0][1], v1[0], v1[1]);
  return true;
}

export function clipEdges(x0, y0, x1, y1) {
  var i = edges.length,
      edge;

  while (i--) {
    if (!connectEdge(edge = edges[i], x0, y0, x1, y1)
        || !clipEdge(edge, x0, y0, x1, y1)
        || !(Math.abs(vertices[edge[0]][0] - vertices[edge[1]][0]) > epsilon
            || Math.abs(vertices[edge[0]][1] - vertices[edge[1]][1]) > epsilon)) {
      delete edges[i];
    }
  }
}
