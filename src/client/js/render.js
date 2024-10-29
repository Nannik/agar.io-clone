const FULL_ANGLE = 2 * Math.PI;

const drawRoundObject = (position, radius, graph, zoom) => {
    graph.beginPath();
    graph.arc(position.x, position.y, radius / zoom, 0, FULL_ANGLE);
    graph.closePath();
    graph.fill();
    graph.stroke();
};

const drawFood = (position, food, graph, zoom) => {
    graph.fillStyle = 'hsl(' + food.hue + ', 100%, 50%)';
    graph.strokeStyle = 'hsl(' + food.hue + ', 100%, 45%)';
    graph.lineWidth = 0;
    drawRoundObject(position, food.radius, graph, zoom);
};

const drawVirus = (position, virus, graph, zoom) => {
    graph.strokeStyle = virus.stroke;
    graph.fillStyle = virus.fill;
    graph.lineWidth = virus.strokeWidth / zoom;
    let theta = 0;
    let sides = 20;

    graph.beginPath();
    for (let theta = 0; theta < FULL_ANGLE; theta += FULL_ANGLE / sides) {
        let point = circlePoint(position, virus.radius / zoom, theta);
        graph.lineTo(point.x, point.y);
    }
    graph.closePath();
    graph.stroke();
    graph.fill();
};

const drawFireFood = (position, mass, playerConfig, graph, zoom) => {
    graph.strokeStyle = 'hsl(' + mass.hue + ', 100%, 45%)';
    graph.fillStyle = 'hsl(' + mass.hue + ', 100%, 50%)';
    graph.lineWidth = playerConfig.border / zoom + 2;
    drawRoundObject(position, mass.radius - 1, graph, zoom);
};

const valueInRange = (min, max, value) => Math.min(max, Math.max(min, value));

const circlePoint = (origo, radius, theta) => ({
    x: origo.x + radius * Math.cos(theta),
    y: origo.y + radius * Math.sin(theta)
});

const cellTouchingBorders = (cell, borders) =>
    cell.x - cell.radius <= borders.left ||
    cell.x + cell.radius >= borders.right ||
    cell.y - cell.radius <= borders.top ||
    cell.y + cell.radius >= borders.bottom;

const regulatePoint = (point, borders) => ({
    x: valueInRange(borders.left, borders.right, point.x),
    y: valueInRange(borders.top, borders.bottom, point.y)
});

const drawCellWithLines = (cell, borders, graph, zoom) => {
    let pointCount = 30 + ~~(cell.mass / 5);
    let points = [];
    for (let theta = 0; theta < FULL_ANGLE; theta += FULL_ANGLE / pointCount) {
        let point = circlePoint(cell, cell.radius / zoom, theta);
        points.push(regulatePoint(point, borders));
    }
    graph.beginPath();
    graph.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        graph.lineTo(points[i].x, points[i].y);
    }
    graph.closePath();
    graph.fill();
    graph.stroke();
};

const drawCells = (cells, playerConfig, toggleMassState, borders, graph, zoom) => {
    for (let cell of cells) {
        drawCell(cell, playerConfig, toggleMassState, borders, graph, zoom);
    }
};

const drawCell = (cell, playerConfig, toggleMassState, borders, graph, zoom) => {
    // Draw the cell itself
    graph.fillStyle = cell.color;
    graph.strokeStyle = cell.borderColor;
    graph.lineWidth = 6 / zoom;
    if (cellTouchingBorders(cell, borders)) {
        // Asssemble the cell from lines
        drawCellWithLines(cell, borders, graph, zoom);
    } else {
        // Border corrections are not needed, the cell can be drawn as a circle
        drawRoundObject(cell, cell.radius, graph, zoom);
    }

    // Draw the name of the player
    let fontSize = Math.max(cell.radius / 3, 12);
    graph.lineWidth = playerConfig.textBorderSize;
    graph.fillStyle = playerConfig.textColor;
    graph.strokeStyle = playerConfig.textBorder;
    graph.miterLimit = 1;
    graph.lineJoin = 'round';
    graph.textAlign = 'center';
    graph.textBaseline = 'middle';
    graph.font = 'bold ' + fontSize + 'px sans-serif';
    graph.strokeText(cell.name, cell.x, cell.y);
    graph.fillText(cell.name, cell.x, cell.y);

    // Draw the mass (if enabled)
    if (toggleMassState === 1) {
        graph.font = 'bold ' + Math.max(fontSize / 3 * 2, 10) + 'px sans-serif';
        if (cell.name.length === 0) fontSize = 0;
        graph.strokeText(Math.round(cell.mass), cell.x, cell.y + fontSize);
        graph.fillText(Math.round(cell.mass), cell.x, cell.y + fontSize);
    }
};

const drawGrid = (global, player, screen, graph, zoom) => {
    graph.lineWidth = 1;
    graph.strokeStyle = global.lineColor;
    graph.globalAlpha = 0.15;
    graph.beginPath();

    const step = 100;
    const w = screen.width * zoom;
    const h = screen.height * zoom;

    const startX = Math.floor((player.x - w / 2) / step) - 1;
    const endX = Math.ceil((player.x + w / 2) / step) + 1;

    const startY = Math.floor((player.y - h / 2) / step) - 1;
    const endY = Math.ceil((player.y + h / 2) / step) + 1;

    const screenLeft = player.x - w / 2;
    const screenTop = player.y - h / 2;

    for (let i = startX; i <= endX; i += 1) {
        const x = (step * i - screenLeft) / zoom;
        graph.moveTo(x, 0);
        graph.lineTo(x, screen.height);
    }

    for (let i = startY; i <= endY; i += 1) {
        const y = (step * i - screenTop) / zoom;
        graph.moveTo(0, y);
        graph.lineTo(screen.width, y);
    }

    graph.stroke();
    graph.globalAlpha = 1;
};

const drawBorder = (borders, graph) => {
    graph.lineWidth = 1;
    graph.strokeStyle = '#000000';
    graph.beginPath();
    graph.moveTo(borders.left, borders.top);
    graph.lineTo(borders.right, borders.top);
    graph.lineTo(borders.right, borders.bottom);
    graph.lineTo(borders.left, borders.bottom);
    graph.closePath();
    graph.stroke();
};

const drawErrorMessage = (message, graph, screen) => {
    graph.fillStyle = '#333333';
    graph.fillRect(0, 0, screen.width, screen.height);
    graph.textAlign = 'center';
    graph.fillStyle = '#FFFFFF';
    graph.font = 'bold 30px sans-serif';
    graph.fillText(message, screen.width / 2, screen.height / 2);
};

module.exports = {
    drawFood,
    drawVirus,
    drawFireFood,
    drawCells,
    drawCell,
    drawErrorMessage,
    drawGrid,
    drawBorder
};
