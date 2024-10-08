import { createArrayTypechecker, createTypechekerFromExample, OptionalField } from "../../util/helpers";

export { WorkListing } from "./Listing";
export { WorkCard } from "./Card";
export { WorkEditor } from "./Edit";
export { WorkPage } from "./Page";

export interface WorkSummary {
    id: number,
    slug: string,
    title: string,
    short_description: string,
    long_description: string,
}

export interface Work extends WorkSummary {
    attachments: {
        id: number,
        work_id: number,
        attachment_kind: string,
        content_type: string,
        filename: string,
        title?: string,
        bytes_base64: string,
        big_file_uuid?: string,
    }[],
    links: {
        id: number,
        work_id: number,
        title: string,
        href: string,
    }[],
    tags: {
        id: number,
        work_id: number,
        tag: string,
    }[],
}

export const typecheckWorkSummary: (value: unknown) => WorkSummary = createTypechekerFromExample({
    id: 0,
    slug: "",
    title: "",
    short_description: "",
    long_description: "",
}, "work_summary");

export const typecheckWorkSummaryArray: (value: unknown) => WorkSummary[] = createArrayTypechecker(typecheckWorkSummary, "work_summaries");

export const typecheckWork: (value: unknown) => Work = createTypechekerFromExample({
    id: 0,
    slug: "",
    title: "",
    short_description: "",
    long_description: "",
    attachments: [{
        id: 0,
        work_id: 0,
        attachment_kind: "",
        content_type: "",
        filename: "",
        title: new OptionalField(""),
        bytes_base64: "",
        big_file_uuid: new OptionalField(""),
    }],
    links: [{
        id: 0,
        work_id: 0,
        title: "",
        href: "",
    }],
    tags: [{
        id: 0,
        work_id: 0,
        tag: "",
    }],
}, "work");

export const typecheckWorkArray: (value: unknown) => Work[] = createArrayTypechecker(typecheckWork, "works");
