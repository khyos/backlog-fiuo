<script lang="ts">
    import { Range } from 'flowbite-svelte';

    export let min = 0;
    export let max = 100;
    export let step = 1;
    export let size: 'sm' | 'md' | 'lg' = 'md';
    export let minValue: number;
    export let maxValue: number;

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    $: minValue, checkMinValue();
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    $: maxValue, checkMaxValue();

    function checkMinValue() {
        if (minValue > maxValue) {
            minValue = maxValue;
        }
    }

    function checkMaxValue() {
        if (maxValue < minValue) {
            maxValue = minValue;
        }
    }
</script>

<div class='doubleRangeWrap'>
    <Range class='minRange appearance-auto' {size} {min} {max} {step} bind:value={minValue} />
    <Range class='maxRange appearance-auto' {size} {min} {max} {step} bind:value={maxValue} />
</div>