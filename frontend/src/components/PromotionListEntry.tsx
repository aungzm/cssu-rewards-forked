

function PromotionListEntry(props : { promotion: any }) {
    const { promotion } = props;
    return (<div>

        <div></div>
        <p> {promotion.name}</p>
        {promotion.type === "automatic" && <p> Automatic Promotion </p>}
        {promotion.type === "one-time" && <p> One-Time Promotion </p>}

        {promotion.type === "automatic" &&
            <p> Active until {promotion.endTime.slice(0, 10)}</p>
        }
        {promotion.type === "one-time" &&
            <p> Available until {promotion.endTime.slice(0, 10)}</p>
        }
    </div>)
}

export default PromotionListEntry;