import { SchemaType } from "@google/generative-ai";

export const contentPackSchema = {
    type: SchemaType.OBJECT,
    properties: {
        source_metadata: {
            type: SchemaType.OBJECT,
            properties: {
                topic_summary: { type: SchemaType.STRING },
                tool_or_feature_demoed: { type: SchemaType.STRING, nullable: true },
                transcript_summary: { type: SchemaType.STRING },
            },
            required: ["topic_summary", "transcript_summary"],
        },
        deconstruction: {
            type: SchemaType.OBJECT,
            properties: {
                core_idea_one_liner: { type: SchemaType.STRING },
                hook_analysis: { type: SchemaType.STRING },
                structure_breakdown: { type: SchemaType.STRING },
                why_this_video_works: { type: SchemaType.STRING },
            },
            required: ["core_idea_one_liner", "hook_analysis", "structure_breakdown", "why_this_video_works"],
        },
        audrey_remix: {
            type: SchemaType.OBJECT,
            properties: {
                hooks: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                },
                hook_variants: {
                    type: SchemaType.OBJECT,
                    properties: {
                        pattern_interrupt: { type: SchemaType.STRING },
                        curiosity_gap: { type: SchemaType.STRING },
                        social_proof: { type: SchemaType.STRING },
                    },
                    required: ["pattern_interrupt", "curiosity_gap", "social_proof"],
                },
                thumbnail_variants: {
                    type: SchemaType.OBJECT,
                    properties: {
                        benefit_focused: { type: SchemaType.STRING },
                        curiosity_focused: { type: SchemaType.STRING },
                        authority_focused: { type: SchemaType.STRING },
                    },
                    required: ["benefit_focused", "curiosity_focused", "authority_focused"],
                },
                cta_variants: {
                    type: SchemaType.OBJECT,
                    properties: {
                        direct_action: { type: SchemaType.STRING },
                        engagement_focused: { type: SchemaType.STRING },
                    },
                    required: ["direct_action", "engagement_focused"],
                },
                short_script: { type: SchemaType.STRING },
                longer_script_version: { type: SchemaType.STRING },
                cta: { type: SchemaType.STRING },
                caption: { type: SchemaType.STRING },
                thumbnail_headline: { type: SchemaType.STRING },
                b_roll_notes: { type: SchemaType.STRING },
                linkedin_image: { type: SchemaType.STRING },
                linkedin_post: { type: SchemaType.STRING },
                performance_tags: {
                    type: SchemaType.OBJECT,
                    properties: {
                        content_type: { type: SchemaType.STRING },
                        emotional_trigger: { type: SchemaType.STRING },
                        topic_cluster: { type: SchemaType.STRING },
                        complexity_level: { type: SchemaType.STRING },
                    },
                    required: ["content_type", "emotional_trigger", "topic_cluster", "complexity_level"],
                },
                performance_hypothesis: { type: SchemaType.STRING },
            },
            required: ["hooks", "hook_variants", "thumbnail_variants", "cta_variants", "short_script", "cta", "caption", "thumbnail_headline", "b_roll_notes", "linkedin_image", "linkedin_post", "performance_tags", "performance_hypothesis"],
        },
    },
    required: ["source_metadata", "deconstruction", "audrey_remix"],
};
