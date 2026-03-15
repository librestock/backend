import { Client } from '../../effect/modules/clients/entities/client.entity';
import { SEED_CONFIG } from './config';
import { buildClient } from './factories';
import { registry } from './registry';

registry.register({
  name: 'clients',
  dependencies: [],
  async run(ctx) {
    console.log('Seeding clients...');

    const clientRepo = ctx.dataSource.getRepository(Client);
    const clients: Client[] = [];

    for (let i = 0; i < SEED_CONFIG.clients; i++) {
      const saved = await clientRepo.save(clientRepo.create(buildClient(i)));
      clients.push(saved);
    }

    console.log(`  Created ${clients.length} clients\n`);
    ctx.store.set('clients', clients);
  },
});
