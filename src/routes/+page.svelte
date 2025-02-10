<h1 class="text-2xl font-extrabold dark:text-white mb-4">Welcome to Backlog</h1>

<script>
    import Backlogs from './backlog/+page.svelte';
    export let data;
</script>
  
<Backlogs {data}/>