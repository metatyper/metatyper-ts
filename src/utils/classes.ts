export type Class<T> = new (
    ...args: any[]
) => T extends new (...args: any[]) => any ? InstanceType<T> : T

export type StaticClass<
    T,
    StaticT = T extends new (...args: any[]) => any ? T : unknown
> = Class<T> & StaticT

export function isClass(value: any): boolean {
    return (
        typeof value === 'function' && /^\s*class\s+/.test(Function.prototype.toString.call(value))
    )
}
