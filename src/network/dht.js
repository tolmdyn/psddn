/**
 * @description Provide the DHT functions.
 *
 * Make use of a distributed hash table to distribute items across the network.
 *
 * The DHT needs to be initialised. This involves creating a new Node instance
 * and connecting to the 'global' DHT network of other nodes/peers via a known
 * bootstrap address.
 *
 * Once initialised, the DHT responds to basic requests from providers for getting
 * and putting items (Feed, Document, User).
 *
 * The DHT requires a minimum number of accessible nodes to function properly
 * but we can create a 'dummy' network of X nodes with an external script.
 *
 * TODO / Questions:
 * An implementation choice is whether to use the DHT to store the actual data
 * or just the location of the data (an updateable list of peers/addresses that
 * have the data).
 */
