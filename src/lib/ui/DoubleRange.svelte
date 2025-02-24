<script lang="ts">
    import { Range } from 'flowbite-svelte';

    export let min = 0;
    export let max = 100;
    export let step = 1;
    export let size: 'sm' | 'md' | 'lg' = 'md';
    export let minValue: number;
    export let maxValue: number;

    $: minValue, checkMinValue();
    $: maxValue, checkMaxValue();

    function checkMinValue() {
        if (minValue >= maxValue) {
            minValue = maxValue;
        }
    }

    function checkMaxValue() {
        if (maxValue <= minValue) {
            maxValue = minValue;
        }
    }
</script>

<div class='doubleRangeWrap'>
    <Range class='minRange appearance-auto' bind:size={size} bind:min={min} bind:max={max} bind:step={step} bind:value={minValue} />
    <Range class='maxRange appearance-auto' bind:size={size} bind:min={min} bind:max={max} bind:step={step} bind:value={maxValue} />
</div>