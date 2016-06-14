/// <reference path="./typings/index.d.ts" />
import {expect} from "chai";
import {root} from "../dist/index";

describe("Scope", () => {
    it("Return simple values", () => {
        expect(root.get(123)).to.equal(123);
    });
})