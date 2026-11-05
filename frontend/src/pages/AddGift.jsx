
import { useState } from "react";
import "../styles/AddGift.css";
import { auth } from "../firebase/firebase";
import { supabase } from "../supabase/supabase";

import {
    doc,
    setDoc,
    serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/firebase";

const categories = {
    "Food & Treats": [
        "Food & Dry Fruits",
        "Chocolates & Sweets",
    ],
    "Home & Living": [
        "Candles & Home Décor",
        "Home & Lifestyle",
        "Kitchen Appliances",
    ],
    "Electronics & Gadgets": [],
    "Lifestyle & Hobbies": [
        "Fashion & Accessories",
        "Books & Stationery",
        "Toys & Games",
        "Other Gifts",
    ],
};

function AddGift() {

    const [formData, setFormData] = useState({
        giftName: "",
        description: "",
        exchangeMode: "",
        category: "",
        subcategory: "",
        condition: "",
        estimatedValue: "",
        purchaseDate: "",
        expiryDate: "",
        preferredExchange: "",
    });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState({
        giftImages: [],
        invoice: null,
    });

    const [giftImages, setGiftImages] = useState([]);
    const [invoice, setInvoice] = useState(null);
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setErrors((prev) => ({
            ...prev,
            [name]: "",
        }));
    };

    const handleCategoryChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            category: e.target.value,
            subcategory: "",
        }));
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files || []);

        if (files.length < 2) {
            setErrors((prev) => ({
                ...prev,
                giftImages: "Please select at least 2 gift photos.",
            }));
            setGiftImages(files);
            return;
        }

        const validTypes = ["image/jpeg", "image/png", "image/webp"];

        if (files.some((file) => !validTypes.includes(file.type))) {
            setErrors((prev) => ({
                ...prev,
                giftImages: "Only JPG, PNG and WebP images are allowed.",
            }));
            setGiftImages(files);
            return;
        }

        if (files.some((file) => file.size > 5 * 1024 * 1024)) {
            setErrors((prev) => ({
                ...prev,
                giftImages: "Each image must be smaller than 5 MB.",
            }));
            setGiftImages(files);
            return;
        }

        if (files.length > 5) {
            setErrors((prev) => ({
                ...prev,
                giftImages: "You can upload a maximum of 5 photos.",
            }));
            setGiftImages(files);
            return;
        }

        setGiftImages(files);
        setErrors((prev) => ({
            ...prev,
            giftImages: "",
        }));
    };

    const handleInvoiceChange = (e) => {
        const file = e.target.files?.[0];

        if (!file) {
            setInvoice(null);
            return;
        }

        const validTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png",
        ];

        if (!validTypes.includes(file.type)) {
            setErrors((prev) => ({
                ...prev,
                invoice: "Invoice must be a PDF, JPG or PNG file.",
            }));
            setInvoice(null);
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setErrors((prev) => ({
                ...prev,
                invoice: "Invoice must be smaller than 5 MB.",
            }));
            setInvoice(null);
            return;
        }

        setInvoice(file);
        setErrors((prev) => ({
            ...prev,
            invoice: "",
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.giftName.trim()) {
            newErrors.giftName = "Gift name is required.";
        }

        if (!formData.description.trim()) {
            newErrors.description = "Description is required.";
        }

        if (!formData.exchangeMode) {
            newErrors.exchangeMode = "Please select an exchange mode.";
        }

        if (!formData.category) {
            newErrors.category = "Please select a category.";
        }

        if (
            formData.category &&
            categories[formData.category].length > 0 &&
            !formData.subcategory
        ) {
            newErrors.subcategory = "Please select a subcategory.";
        }

        if (!formData.condition) {
            newErrors.condition = "Please select the condition.";
        }

        if (
            !formData.estimatedValue ||
            Number(formData.estimatedValue) <= 0
        ) {
            newErrors.estimatedValue = "Enter a valid estimated value.";
        }

        if (giftImages.length < 2 || giftImages.length > 5) {
            newErrors.giftImages = "Upload between 2 and 5 gift photos.";
        }

        if (
            formData.purchaseDate &&
            formData.expiryDate &&
            formData.expiryDate < formData.purchaseDate
        ) {
            newErrors.expiryDate =
                "Expiry date cannot be earlier than purchase date.";
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setSuccessMessage("");

        if (!validateForm()) {
            return;
        }

        const currentUser = auth.currentUser;

        if (!currentUser) {
            setErrors({
                submit: "Please log in before uploading a gift.",
            });
            return;
        }

        setIsUploading(true);
        setErrors({});

        const listingId = crypto.randomUUID();
        const uploadedImagePaths = [];
        let uploadedInvoicePath = null;

        try {
            // Upload gift photos
            for (const file of giftImages) {
                const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

                const filePath =
                    `${currentUser.uid}/${listingId}/${Date.now()}-${safeFileName}`;

                const { error } = await supabase.storage
                    .from("gift-images")
                    .upload(filePath, file, {
                        contentType: file.type,
                        upsert: false,
                    });

                if (error) {
                    throw error;
                }

                uploadedImagePaths.push(filePath);
            }

            // Upload optional invoice
            if (invoice) {
                const safeFileName = invoice.name.replace(
                    /[^a-zA-Z0-9._-]/g,
                    "_"
                );

                const invoicePath =
                    `${currentUser.uid}/${listingId}/${Date.now()}-${safeFileName}`;

                const { error } = await supabase.storage
                    .from("gift-invoices")
                    .upload(invoicePath, invoice, {
                        contentType: invoice.type,
                        upsert: false,
                    });

                if (error) {
                    throw error;
                }

                uploadedInvoicePath = invoicePath;
            }

            // Get public URLs for gift photos
            const imageUrls = uploadedImagePaths.map((path) => {
                const { data } = supabase.storage
                    .from("gift-images")
                    .getPublicUrl(path);

                return data.publicUrl;
            });
            // Save gift listing in Firestore
            await setDoc(doc(db, "gifts", listingId), {
                listingId: listingId,
                ownerUid: currentUser.uid,

                giftName: formData.giftName.trim(),
                description: formData.description.trim(),

                exchangeMode: formData.exchangeMode,
                category: formData.category,
                subcategory: formData.subcategory,

                condition: formData.condition,
                estimatedValue: Number(formData.estimatedValue),

                purchaseDate: formData.purchaseDate || null,
                expiryDate: formData.expiryDate || null,

                preferredExchange: formData.preferredExchange.trim(),

                imageUrls: imageUrls,
                imagePaths: uploadedImagePaths,

                invoicePath: uploadedInvoicePath,

                status: "Available",

                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            setUploadedFiles({
                giftImages: imageUrls,
                invoice: uploadedInvoicePath,
            });

            console.log("Listing ID:", listingId);
            console.log("Gift details:", formData);
            console.log("Gift image URLs:", imageUrls);
            console.log("Invoice storage path:", uploadedInvoicePath);

            setSuccessMessage(
                "Your gift has been successfully listed on ReGifty!"
            );

        } catch (error) {
            console.error("Storage upload error:", error);

            // Remove partially uploaded files if something fails
            if (uploadedImagePaths.length > 0) {
                await supabase.storage
                    .from("gift-images")
                    .remove(uploadedImagePaths);
            }

            if (uploadedInvoicePath) {
                await supabase.storage
                    .from("gift-invoices")
                    .remove([uploadedInvoicePath]);
            }

            setErrors({
                submit: error.message || "File upload failed. Please try again.",
            });

        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="add-gift-page">
            <div className="add-gift-container">
                <h1>Add Your Gift</h1>

                <p className="add-gift-subtitle">
                    Give your unused gifts a new home through ReGifty.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Gift Name *</label>
                        <input
                            type="text"
                            name="giftName"
                            placeholder="Enter gift name"
                            value={formData.giftName}
                            onChange={handleChange}
                        />
                        {errors.giftName && (
                            <p className="error-message">{errors.giftName}</p>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Description *</label>
                        <textarea
                            name="description"
                            placeholder="Describe your gift..."
                            value={formData.description}
                            onChange={handleChange}
                            rows="4"
                        />
                        {errors.description && (
                            <p className="error-message">{errors.description}</p>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Exchange Mode *</label>
                        <select
                            name="exchangeMode"
                            value={formData.exchangeMode}
                            onChange={handleChange}
                        >
                            <option value="">Select exchange mode</option>
                            <option value="Swap">Swap</option>
                            <option value="Swap + Money">Swap + Money</option>
                            <option value="Buy/Sell">Buy/Sell</option>
                        </select>
                        {errors.exchangeMode && (
                            <p className="error-message">{errors.exchangeMode}</p>
                        )}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Category *</label>
                            <select
                                value={formData.category}
                                onChange={handleCategoryChange}
                            >
                                <option value="">Select category</option>
                                {Object.keys(categories).map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                            {errors.category && (
                                <p className="error-message">{errors.category}</p>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Subcategory *</label>
                            <select
                                name="subcategory"
                                value={formData.subcategory}
                                onChange={handleChange}
                                disabled={
                                    !formData.category ||
                                    categories[formData.category].length === 0
                                }
                            >
                                <option value="">
                                    {formData.category &&
                                        categories[formData.category].length === 0
                                        ? "No subcategory"
                                        : "Select subcategory"}
                                </option>

                                {formData.category &&
                                    categories[formData.category].map((subcategory) => (
                                        <option key={subcategory} value={subcategory}>
                                            {subcategory}
                                        </option>
                                    ))}
                            </select>
                            {errors.subcategory && (
                                <p className="error-message">{errors.subcategory}</p>
                            )}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Condition *</label>
                            <select
                                name="condition"
                                value={formData.condition}
                                onChange={handleChange}
                            >
                                <option value="">Select condition</option>
                                <option value="New">New</option>
                                <option value="Like New">Like New</option>
                                <option value="Good">Good</option>
                                <option value="Fair">Fair</option>
                            </select>
                            {errors.condition && (
                                <p className="error-message">{errors.condition}</p>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Estimated Value (₹) *</label>
                            <input
                                type="number"
                                name="estimatedValue"
                                min="1"
                                placeholder="Enter estimated value"
                                value={formData.estimatedValue}
                                onChange={handleChange}
                            />
                            {errors.estimatedValue && (
                                <p className="error-message">
                                    {errors.estimatedValue}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Purchase Date</label>
                            <input
                                type="date"
                                name="purchaseDate"
                                value={formData.purchaseDate}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Expiry Date (if applicable)</label>
                            <input
                                type="date"
                                name="expiryDate"
                                value={formData.expiryDate}
                                onChange={handleChange}
                            />
                            {errors.expiryDate && (
                                <p className="error-message">{errors.expiryDate}</p>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Gift Photos * (Minimum 2, Maximum 5)</label>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={handleImageChange}
                        />
                        <small>JPG, PNG or WebP. Maximum 5 MB per image.</small>

                        {giftImages.length > 0 && (
                            <p className="file-info">
                                {giftImages.length} photo(s) selected
                            </p>
                        )}

                        {errors.giftImages && (
                            <p className="error-message">{errors.giftImages}</p>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Invoice (Optional)</label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleInvoiceChange}
                        />
                        <small>
                            PDF, JPG or PNG. Maximum 5 MB. Redact personal details
                            before uploading.
                        </small>

                        {invoice && (
                            <p className="file-info">{invoice.name}</p>
                        )}

                        {errors.invoice && (
                            <p className="error-message">{errors.invoice}</p>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Preferred Exchange Items</label>
                        <textarea
                            name="preferredExchange"
                            placeholder="What would you like in exchange? (Optional)"
                            value={formData.preferredExchange}
                            onChange={handleChange}
                            rows="3"
                        />
                    </div>

                    {successMessage && (
                        <p className="success-message">{successMessage}</p>
                    )}

                    {errors.submit && (
                        <p className="error-message">{errors.submit}</p>
                    )}

                    <button
                        type="submit"
                        className="add-gift-submit"
                        disabled={isUploading}
                    >
                        {isUploading ? "Uploading..." : "Upload Gift Files"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default AddGift;
