export interface Constructor<T> extends Function {
    new(...args: any[]): T;
    prototype: T;
}

const supported = (typeof Symbol === 'function') && (typeof Symbol() === 'symbol');
var count = 0;

export type Name = string | symbol;
export type Binding<T> = Factory<T> | T;  
export type BindingMap = {[key: string]: Binding<any>};

export interface Factory<T> {
    (context: context): T;
    bind(context: context): Factory<T>
} 

const makeName = (title: string = 'Symbol') => `@@pq:${name}/${++count}`;
const makeSymbol = (supported ? Symbol : makeName) as (title: string) => Name 
const names = Object.create(null);
const dict = () => Object.create(null);

export function Name(title?: string): Name {
    var name = makeSymbol(title);
    names[name] = true;
    return name;
}

function props(obj: {}): PropertyDescriptorMap {
    var res = dict();
    const collect = (name: Name) => { 
        res[name] = Object.getOwnPropertyDescriptor(obj, name) 
    };
    Object.getOwnPropertyNames(obj).forEach(collect);
    if (supported) Object.getOwnPropertySymbols(obj).forEach(collect);
    return res;
}

export function extend<T, U>(base: T, extensions: U): T & U {
    return Object.create(base, props(extensions));
}

function isFactory<T>(subject: any): subject is Factory<T> {
    return (typeof subject === "function") && (subject.bind === $bind);
}

const DEPENDENCIES = Name("dependencies");
export function dependenciesOf(Class: Constructor<any>): Binding<any>[] {
    return ((Class as any)[DEPENDENCIES]||[]) as Binding<any>[]; 
}

export function dep<U>(dep: Binding<U>) {
    return <T>(Class: Constructor<T>) => {
        (Class.prototype as any)[DEPENDENCIES] = ref([dep])
    }
}

export function deps<U>(deps: Binding<U>[]) {
    return <T>(Class: Constructor<T>) => {
        (Class.prototype as any)[DEPENDENCIES] = ref(deps)
    }
}

export interface context {
    get<T>(value: Binding<T>): T;
    set(bindings: BindingMap): context;
    [key: string]: Binding<{}>;
}

function get<T>(subject: Binding<T>): T {
    return isFactory(subject) ? subject(this) : subject
}

function set(bindings: BindingMap): context {
    var context = extend(this, bindings);
    context.get = get.bind(context);
    context.set = set.bind(context);
    return context;
}


const bind = Function.prototype.bind; 
function $bind() {
    if (isFactory(this)) {
        var bound = bind.apply(this, arguments)
        bound.bind = $bind;
        return bound;
    } else {
        return this;
    }
}

function mark<T>(factory: Factory<T>): Factory<T> {
    factory.bind = $bind;
    return factory;
}


function make<T>(Class: Constructor<T>): T {
    return new Class(...this.get(dependenciesOf(Class)));
}

export function fresh<T>(Class: Constructor<T>) { 
    return mark(function (child: context) {
         return make.call(child, Class) as T
    });
}

function lift(value: any) {
    var result = Array.isArray(value) ? [] : Object.getPrototypeOf(value) === Object.prototype ? dict() : null;
    if (result) {
        const collect = (p: string|symbol) => result[p] = lift.call(this, value[p])
        Object.keys(value).forEach(collect);
        if (supported) Object.getOwnPropertySymbols(value).forEach(collect);
        return result;
    } else {
        return this(value);
    }
}

export function ref<T>(name: {}) {
    return mark(function(child: context): T {
        return lift.call((name: string) => child.get($bind.call(child[name], this)), name);
    });
}

export function singleton<T>(Class: Constructor<T>) {
    var instance: T;
    return mark((child: context) => {
        if (!instance) {
            instance = make.call(this, Class); 
        }
        return instance;
    });
}

export const root = Object.create(null) as context;
root.get = get.bind(root);
root.set = set.bind(root);

