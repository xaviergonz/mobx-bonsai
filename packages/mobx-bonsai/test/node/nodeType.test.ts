import { getSnapshot, isNode, node, nodeType, nodeTypeKey, TNode } from "../../src"

it("should return the same node when the same type and key are used", () => {
  type TType = TNode<"type", { id: string }>
  using tType = nodeType<TType>("type").withKey("id")

  type TType2 = TNode<"type2", { id: string }>
  using tType2 = nodeType<TType2>("type2").withKey("id")

  type TType3 = TNode<"type3", { id: string }>
  using tType3 = nodeType<TType3>("type3").withKey("id")

  type TType4 = TNode<"type4", { id: string }>
  using tType4 = nodeType<TType4>("type4").withKey("id")

  const nObj1 = tType({ id: "key" })
  expect(node(getSnapshot(nObj1))).toBe(nObj1)

  const nObj2 = tType2({ id: "key2" })
  expect(tType2({ id: "key3" })).not.toBe(nObj2)

  const nObj3 = tType3({ id: "key" })
  const nObj4 = tType4({ id: "key" })
  expect(nObj3).not.toBe(nObj4)
})

it("unique node reconciliation", () => {
  type T2 = TNode<
    "t2",
    {
      id: string
      a: number
    }
  >

  type T = TNode<
    "t",
    {
      id: string
      a: number
      b: { c: number }
      arr: { d: number }[]
      arr2: { d: number }[]
      uni: T2
    }
  >

  using tT = nodeType<T>("t").withKey("id")
  using tT2 = nodeType<T2>("t2").withKey("id")

  const nObj1 = tT({
    id: "key",
    a: 1,
    b: { c: 1 },
    arr: [{ d: 1 }],
    arr2: [{ d: 1 }, { d: 1 }],
    uni: tT2({
      id: "key",
      a: 1,
    }),
  })
  const arr = nObj1.arr
  const uni1 = nObj1.uni

  const obj2 = {
    [nodeTypeKey]: tT.typeId,
    id: "key",
    a: 2,
    b: { c: 2 },
    d: 2,
    arr: [{ d: 2 }, { d: 3 }],
    arr2: [{ d: 2 }],
    uni: tT2.snapshot({
      id: "key",
      a: 2,
    }),
  }
  const nObj2 = node(obj2)

  expect(nObj2).toBe(nObj1)
  expect(nObj2.arr).toBe(arr)
  expect(nObj2.arr[0]).toBe(arr[0])
  expect(nObj2.uni).toBe(uni1)
  expect(getSnapshot(nObj2)).toStrictEqual(obj2)
})

it("swapping a node in an array should be ok if we reconciliate", () => {
  type TA = TNode<"a", { id: string; a: number }>
  using tA = nodeType<TA>("a").withKey("id")

  const nObj1 = node([
    tA.snapshot({
      id: "1",
      a: 1,
    }),
    tA.snapshot({
      id: "2",
      a: 2,
    }),
  ])
  const n1 = nObj1[0]
  const n2 = nObj1[1]

  const nObj2 = node([
    tA.snapshot({
      id: "2",
      a: 3,
    }),
    tA.snapshot({
      id: "1",
      a: 4,
    }),
  ])

  expect(nObj2).not.toBe(nObj1)
  expect(nObj2[0]).toBe(n2)
  expect(nObj2[1]).toBe(n1)
  expect(n2.a).toBe(3)
  expect(n1.a).toBe(4)
})

test("auto generates key if missing in snapshot", () => {
  type Todo = TNode<"todo", { id: string; title: string }>
  using tTodo = nodeType<Todo>("todo").withKey("id")

  const node = tTodo.snapshot({
    title: "Test Todo",
  })
  expect(node.id).toBe("id-1")
})

test("typed nodes with actions/getters/computeds/volatile", () => {
  type Todo = TNode<"todo", { id: string; title: string }>
  using tTodo = nodeType<Todo>("todo")
    .withKey("id")
    .volatile({
      x: () => 3,
    })
    .getters({
      getTitleLengthPlusXPlusParam(param: number) {
        return tTodo.getTitleLength(this) + tTodo.getX(this) + param
      },
    })
    .computeds({
      getTitleLength() {
        return this.title.length
      },
      getTitleLength2: {
        get() {
          return this.title.length
        },
        equals: (a, b) => a === b,
      },
    })
    .actions({
      setTitle(title: string) {
        this.title = title
      },
    })

  const node = tTodo({
    title: "Test Todo",
  })

  expect(tTodo.getTitleLength(node)).toBe(9)
  expect(tTodo.getTitleLength2(node)).toBe(9)
  expect(tTodo.getTitleLengthPlusXPlusParam(node, 5)).toBe(17)
  expect(tTodo.getX(node)).toBe(3)

  tTodo.setTitle(node, "Test Todo 2")
  expect(node.title).toBe("Test Todo 2")

  tTodo.setX(node, 4)
  expect(tTodo.getX(node)).toBe(4)
  expect(tTodo.getTitleLength(node)).toBe(11)
  expect(tTodo.getTitleLength2(node)).toBe(11)
  expect(tTodo.getTitleLengthPlusXPlusParam(node, 5)).toBe(20)
  expect(tTodo.getX(node)).toBe(4)
})

test("untyped nodes with actions/getters/computeds/volatile", () => {
  type Todo = { title: string }
  const tTodo = nodeType<Todo>()
    .volatile({
      x: () => 3,
    })
    .getters({
      getTitleLengthPlusXPlusParam(param: number) {
        return tTodo.getTitleLength(this) + tTodo.getX(this) + param
      },
    })
    .computeds({
      getTitleLength() {
        return this.title.length
      },
      getTitleLength2: {
        get() {
          return this.title.length
        },
        equals: (a, b) => a === b,
      },
    })
    .actions({
      setTitle(title: string) {
        this.title = title
      },
    })

  const node = tTodo({
    title: "Test Todo",
  })

  expect(tTodo.getTitleLength(node)).toBe(9)
  expect(tTodo.getTitleLength2(node)).toBe(9)
  expect(tTodo.getTitleLengthPlusXPlusParam(node, 5)).toBe(17)
  expect(tTodo.getX(node)).toBe(3)

  tTodo.setTitle(node, "Test Todo 2")
  expect(node.title).toBe("Test Todo 2")

  tTodo.setX(node, 4)
  expect(tTodo.getX(node)).toBe(4)
  expect(tTodo.getTitleLength(node)).toBe(11)
  expect(tTodo.getTitleLength2(node)).toBe(11)
  expect(tTodo.getTitleLengthPlusXPlusParam(node, 5)).toBe(20)
  expect(tTodo.getX(node)).toBe(4)
})

test("node type with setters", () => {
  type Book = { title: string; author: string; pageCount: number }
  const tBook = nodeType<Book>().settersFor("title", "author", "pageCount")

  const book = tBook({
    title: "1984",
    author: "George Orwell",
    pageCount: 328,
  })

  tBook.setTitle(book, "Animal Farm")
  tBook.setAuthor(book, "G. Orwell")
  tBook.setPageCount(book, 112)

  expect(book.title).toBe("Animal Farm")
  expect(book.author).toBe("G. Orwell")
  expect(book.pageCount).toBe(112)
})

test("node type setters work with readonly arrays", () => {
  type TodoList = {
    name: string
    todos: string[]
  }

  const tTodoList = nodeType<TodoList>().settersFor("name", "todos")

  const todoList = tTodoList({
    name: "Shopping List",
    todos: ["Milk", "Eggs"],
  })

  const newTodos: readonly string[] = ["Bread", "Cheese", "Apples"]
  tTodoList.setTodos(todoList, newTodos)

  expect(todoList.todos).toEqual(["Bread", "Cheese", "Apples"])
  expect(todoList.todos).not.toBe(newTodos)
})

test("node type with defaults for untyped nodes", () => {
  type Book = { title: string; author: string; pageCount: number }
  const TBook = nodeType<Book>().defaults({
    pageCount: () => 100,
    author: () => "Unknown Author",
  })

  const book1 = TBook({
    title: "1984",
  })

  expect(book1.title).toBe("1984")
  expect(book1.author).toBe("Unknown Author")
  expect(book1.pageCount).toBe(100)

  const book2 = TBook({
    title: "Animal Farm",
    author: "George Orwell",
    pageCount: 140,
  })

  expect(book2.title).toBe("Animal Farm")
  expect(book2.author).toBe("George Orwell")
  expect(book2.pageCount).toBe(140)

  const bookSnapshot = TBook.snapshot({
    title: "Brave New World",
  })

  expect(bookSnapshot.title).toBe("Brave New World")
  expect(bookSnapshot.author).toBe("Unknown Author")
  expect(bookSnapshot.pageCount).toBe(100)
})

test("node type with defaults for typed nodes", () => {
  type TodoItem = TNode<
    "todo",
    {
      id: string
      title: string
      completed: boolean
      priority: number
    }
  >

  const TTodo = nodeType<TodoItem>("todo").defaults({
    completed: () => false,
    priority: () => 3,
  })

  const todo1 = TTodo({
    id: "1",
    title: "Buy milk",
  })

  expect(todo1.id).toBe("1")
  expect(todo1.title).toBe("Buy milk")
  expect(todo1.completed).toBe(false)
  expect(todo1.priority).toBe(3)

  const todoSnapshot = TTodo.snapshot({
    id: "2",
    title: "Buy eggs",
  })

  expect(todoSnapshot.id).toBe("2")
  expect(todoSnapshot.title).toBe("Buy eggs")
  expect(todoSnapshot.completed).toBe(false)
  expect(todoSnapshot.priority).toBe(3)
})

test("node type with defaults and withKey should auto-generate keys", () => {
  type User = TNode<
    "user",
    {
      id: string
      name: string
      email: string
    }
  >

  const TUser = nodeType<User>("user")
    .defaults({
      email: () => "default@example.com",
    })
    .withKey("id")

  const user = TUser({
    name: "John Doe",
  })

  expect(user.id).toBeDefined()
  expect(user.name).toBe("John Doe")
  expect(user.email).toBe("default@example.com")
})

test("node type defaults should compose in order", () => {
  type Todo = { title: string; description: string; priority: number; tags: string[] }

  const TTodo = nodeType<Todo>()
    .defaults({
      description: () => "",
      priority: () => 1,
    })
    .defaults({
      tags: () => [],
      priority: () => 2,
    })

  const todo = TTodo({
    title: "Test task",
  })

  expect(todo.title).toBe("Test task")
  expect(todo.description).toBe("")
  expect(todo.priority).toBe(2)
  expect(todo.tags).toEqual([])
})

test("node type defaults with arrays", () => {
  type TodoList = {
    name: string
    items: { task: string; done: boolean }[]
  }

  const TList = nodeType<TodoList>().defaults({
    items: () => [],
  })

  const list = TList({
    name: "My List",
  })

  expect(list.name).toBe("My List")
  expect(list.items).toEqual([])
  expect(Array.isArray(list.items)).toBe(true)
})

test("node type defaults with complex objects", () => {
  type Contact = {
    name: string
    address: {
      street: string
      city: string
      zip: string
    }
  }

  const TContact = nodeType<Contact>().defaults({
    address: () => ({ street: "", city: "", zip: "" }),
  })

  const contact = TContact({
    name: "John Smith",
  })

  expect(contact.name).toBe("John Smith")
  expect(contact.address).toEqual({ street: "", city: "", zip: "" })
  expect(isNode(contact.address)).toBe(true)
})

test("generic node type", () => {
  interface Obj<T> {
    data: T
  }

  const TObj = nodeType<Obj<number>>()
    .defaults({
      data: () => 0,
    })
    .actions({
      setData(data: number) {
        this.data = data
      },
    })

  const genericNode = TObj({ data: 100 })
  expect(genericNode.data).toBe(100)
})

test("generic node type factory", () => {
  interface Obj<T> {
    data: T
    else: string
  }

  const createTObj = <T>() =>
    nodeType<Obj<T>>()
      .defaults({
        else: () => "hello",
      })
      .actions({
        setData(data: T) {
          this.data = data
        },
      })

  const TObj = createTObj<number>()

  const genericNode = TObj({ data: 100 })
  expect(genericNode.data).toBe(100)
})
