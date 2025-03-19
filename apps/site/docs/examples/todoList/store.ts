import { connectReduxDevTools, nodeType, TNode } from "mobx-bonsai"

const todoType = "todoSample/Todo"

export type Todo = TNode<
  typeof todoType,
  {
    id: string
    text: string
    done: boolean
  }
>

export const TTodo = nodeType<Todo>(todoType)
  .withKey("id")
  .defaults({
    done: () => false,
  })
  .settersFor("done", "text")

const todoListType = "todoSample/TodoList"

export type TodoList = TNode<typeof todoListType, { todos: Todo[] }>

export const TTodoList = nodeType<TodoList>(todoListType)
  .defaults({
    todos: () => [],
  })
  .getters({
    getPending() {
      return this.todos.filter((t) => !t.done)
    },
    getDone() {
      return this.todos.filter((t) => t.done)
    },
  })
  .actions({
    add(todo: Todo) {
      this.todos.push(todo)
    },

    remove(todo: Todo) {
      const index = this.todos.indexOf(todo)
      if (index >= 0) {
        this.todos.splice(index, 1)
      }
    },
  })

export function createDefaultTodoList(): TodoList {
  // the parameter is the initial data for the model
  return TTodoList({
    todos: [
      // we could just use the objects here directly, but then we'd need to
      // generate the ids and add the [nodeType] property ourselves
      TTodo({ text: "make mobx-bonsai awesome!" }),
      TTodo({ text: "spread the word" }),
      TTodo({ text: "buy some milk", done: true }),
    ],
  })
}

export function createRootStore(): TodoList {
  const rootStore = createDefaultTodoList()

  // we can also connect the store to the redux dev tools
  const remotedev = require("remotedev")
  const connection = remotedev.connectViaExtension({
    name: "Todo List Example",
  })

  connectReduxDevTools(remotedev, connection, rootStore)

  return rootStore
}
