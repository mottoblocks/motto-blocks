import { useMemo } from "@wordpress/element";
import { useSelect } from "@wordpress/data";

import { buildCssClassRegistryMaps, collectMottoCssClassRecords } from "./css-class-registry-maps";
import { createCssClassRefResolver } from "./css-class-editor-session";

export const useCssClassRegistry = () => {
	const classQueryBase = useMemo(
		() => ({
			per_page: 100,
			status: ["publish", "private", "draft", "pending", "future"],
			context: "edit",
			_fields: ["id", "slug", "title", "meta"],
		}),
		[]
	);
	const classStyleQuery = useMemo(
		() => ({
			per_page: 100,
			status: ["publish", "private", "draft", "pending", "future"],
			_fields: ["id", "slug", "meta"],
			context: "edit",
		}),
		[]
	);
	const classRecords = useSelect((select) => collectMottoCssClassRecords(select("core")), []);

	return useMemo(() => {
		const { recordsById, slugById, idBySlug, uidById, idByUid } =
			buildCssClassRegistryMaps(classRecords);

		const classUidById = uidById;

		return {
			classQuery: classQueryBase,
			classStyleQuery,
			classRecords,
			classRecordsById: recordsById,
			classSlugById: slugById,
			classIdMap: idBySlug,
			classUidById,
			resolveLinkedClassRef: createCssClassRefResolver({
				classSlugById: slugById,
				classIdMap: idBySlug,
				classUidById: uidById,
				idByUid,
			}),
		};
	}, [classQueryBase, classRecords, classStyleQuery]);
};
