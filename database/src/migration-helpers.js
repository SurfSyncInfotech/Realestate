// Wraps a knex instance so every createTable uses the InnoDB engine.
// `knex.schema` is a getter that returns a NEW builder each time it is read, so
// the wrapper must do the same: sharing one builder would replay earlier
// statements on every later await ("Table already exists").
export function withInnoDB(knex) {
  const wrapSchema = (builder) =>
    new Proxy(builder, {
      get(target, property, receiver) {
        if (property === "createTable") {
          return (name, callback) =>
            target.createTable(name, (table) => {
              table.engine("InnoDB");
              callback(table);
            });
        }
        return Reflect.get(target, property, receiver);
      },
    });

  return new Proxy(knex, {
    get(target, property, receiver) {
      if (property === "schema") {
        return wrapSchema(target.schema);
      }
      return Reflect.get(target, property, receiver);
    },
  });
}
