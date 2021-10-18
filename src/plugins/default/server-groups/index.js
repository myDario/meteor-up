import DigitalOcean from './digital-ocean';
import { waitForServers } from './utils';

function createSourceConfig(SourceAPI) {
  return {
    async load({ name, groupConfig }, pluginApi) {
      const api = new SourceAPI(name, groupConfig, pluginApi);

      return api.getServers();
    },
    async upToDate({ name, groupConfig, list }, pluginApi) {
      const api = new SourceAPI(name, groupConfig, pluginApi);
      const { wrong, good } = await api.compareServers(list);

      return wrong.length === 0 && good.length === groupConfig.count;
    },
    async update({ name, groupConfig }, pluginApi) {
      const api = new SourceAPI(name, groupConfig, pluginApi);
      const { wrong, good } = await api.compareServers();

      const addCount = Math.max(0, groupConfig.count - good.length);
      const goodRemoveCount = Math.max(0, good.length - groupConfig.count);

      // If the region or type changed, all of the servers are wrong.
      // We want to temporarily keep some of the wrong servers so they can
      // handle requests until the new servers are ready
      const min = Math.ceil(groupConfig.count / 2);
      const tempCount = Math.min(wrong.length, min - groupConfig.count);

      if (goodRemoveCount > 0) {
        console.log(`=> Removing ${goodRemoveCount} servers for ${name}`);
        await api.removeServers(good.slice(0, goodRemoveCount));
        console.log(`=> Finished removing ${goodRemoveCount} servers for ${name}`);
      }
      if (wrong.length > 0) {
        // TODO: don't delete tempCount until mup successfully exits
        console.log(`=> Removing ${wrong.length} servers for ${name}`);
        await api.removeServers(wrong);
        console.log(`=> Finished removing ${wrong.length} servers for ${name}`);
      }
      if (addCount > 0) {
        console.log(`=> Creating ${addCount} servers for ${name}`);
        const created = await api.createServers(addCount);
        await waitForServers(created, pluginApi);
        console.log(`=> Finished creating ${addCount} servers for ${name}`);
      }
    }
  };
}

const serverSources = {
  'digital-ocean': createSourceConfig(DigitalOcean)
};

export default serverSources;