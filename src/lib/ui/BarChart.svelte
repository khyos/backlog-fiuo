<script lang="ts">
    export let bars: { label: string; value: number }[] = [];
    export let color = '#3b82f6';

    const W = 400;
    const H = 120;
    const padL = 22;
    const padR = 6;
    const padT = 6;
    const padB = 22;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    $: maxVal = Math.max(...bars.map(b => b.value), 1);
    $: barW   = plotW / Math.max(bars.length, 1);
    $: gap    = Math.max(1, barW * 0.25);
    $: yMid   = Math.ceil(maxVal / 2);

    const bh = (v: number) => (v / maxVal) * plotH;
    const bx = (i: number) => padL + i * barW + gap / 2;
    const by = (v: number) => padT + plotH - bh(v);
    const lx = (i: number) => padL + (i + 0.5) * barW;
</script>

<svg viewBox="0 0 {W} {H}" class="w-full h-auto">
    <!-- grid lines -->
    <line x1={padL} y1={padT}              x2={W - padR} y2={padT}              class="stroke-gray-200 dark:stroke-gray-600" stroke-width="0.5" />
    <line x1={padL} y1={padT + plotH / 2}  x2={W - padR} y2={padT + plotH / 2}  class="stroke-gray-200 dark:stroke-gray-600" stroke-width="0.5" />
    <line x1={padL} y1={padT + plotH}      x2={W - padR} y2={padT + plotH}      class="stroke-gray-200 dark:stroke-gray-600" stroke-width="0.5" />

    <!-- Y axis labels -->
    <text x={padL - 3} y={padT + 3}              text-anchor="end" font-size="8" class="fill-gray-400 dark:fill-gray-500">{maxVal}</text>
    <text x={padL - 3} y={padT + plotH / 2 + 3}  text-anchor="end" font-size="8" class="fill-gray-400 dark:fill-gray-500">{yMid}</text>
    <text x={padL - 3} y={padT + plotH + 3}       text-anchor="end" font-size="8" class="fill-gray-400 dark:fill-gray-500">0</text>

    <!-- bars + X labels -->
    {#each bars as bar, i (bar.label)}
        {#if bar.value > 0}
            <rect
                x={bx(i)}
                y={by(bar.value)}
                width={barW - gap}
                height={bh(bar.value)}
                fill={color}
                rx="2"
            >
                <title>{bar.label}: {bar.value}</title>
            </rect>
        {/if}
        <text
            x={lx(i)}
            y={H - 4}
            text-anchor="middle"
            font-size="8"
            class="fill-gray-500 dark:fill-gray-400"
        >{bar.label}</text>
    {/each}
</svg>
